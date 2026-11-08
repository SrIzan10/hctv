import { lucia } from '@hctv/auth';
import { getRedisConnection } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { session } = await validateRequest(event);
  if (session) {
    await getRedisConnection().del(`sessions:${session.id}`);
    await lucia.invalidateSession(session.id);
  }
  const sessionCookie = lucia.createBlankSessionCookie();
  setCookie(event, sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  // Next version redirect('/')ed; the client navigates instead
  return { success: true, redirect: '/' };
});
