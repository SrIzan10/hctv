import type { H3Event } from 'h3';
import type { Session, User } from 'lucia';
import { lucia } from '@hctv/auth';
import { getRedisConnection } from '@hctv/db';

export type AuthState = { user: User | null; session: Session | null };

// h3 port of the old `validateRequest`; memoized on the event so it runs once per request
// the event is optional: with nitro's asyncContext it is resolved via useEvent(), so ported
// call sites can keep calling `validateRequest()` the way they did under Next
export async function validateRequest(explicitEvent?: H3Event): Promise<AuthState> {
  const event = explicitEvent ?? useEvent();
  if (event.context.auth) return event.context.auth as AuthState;

  const sessionId = getCookie(event, lucia.sessionCookieName) ?? null;
  if (!sessionId) {
    event.context.auth = { user: null, session: null } satisfies AuthState;
    return event.context.auth as AuthState;
  }

  const { user, session } = await lucia.validateSession(sessionId);
  if (session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    await getRedisConnection().set(`sessions:${session.id}`, '');
    setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }

  event.context.auth = { user, session } satisfies AuthState;
  return event.context.auth as AuthState;
}

// for API handlers: throws a 401 so callers can destructure a non-null user
export async function requireUser(event: H3Event) {
  const { user, session } = await validateRequest(event);
  if (!user || !session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  return { user, session };
}

export async function requireAdmin(event: H3Event) {
  const auth = await requireUser(event);
  if (!auth.user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  return auth;
}
