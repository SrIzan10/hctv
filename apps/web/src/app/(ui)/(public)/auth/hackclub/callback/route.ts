import { hackClub, lucia, HCID_TOKEN_URL, HCID_USER_INFO_URL } from '@hctv/auth';
import { cookies as nextCookies } from 'next/headers';
import { OAuth2RequestError } from 'arctic';
import { generateIdFromEntropySize } from 'lucia';
import { prisma } from '@hctv/db';
import { getRedisConnection } from '@hctv/db';

export async function GET(request: Request): Promise<Response> {
  const cookies = await nextCookies();
  const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get("hackclub_oauth_state")?.value ?? null;
	if (!code || !state || !storedState || state !== storedState) {
    console.log('invalid state stuff');
		return new Response(null, {
			status: 400
		});
	}

  try {
    const tokens = await hackClub.validateAuthorizationCode(HCID_TOKEN_URL, code, null);
    const accessToken = tokens.accessToken();
    const userResponse = await fetch(HCID_USER_INFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const userResult: HackClubUserResponse = await userResponse.json();
    const identity = userResult.identity;

    const slackId = identity.slack_id || identity.id;

    const existingUser = await prisma.user.findFirst({
      where: {
        slack_id: slackId,
      },
    });

    if (existingUser) {
      // Update email if it's missing or changed
      if (existingUser.email !== identity.primary_email) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: identity.primary_email },
        });
      }

      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      await getRedisConnection().set(`sessions:${session.id}`, '');
      cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
        },
      });
    }

    const userId = generateIdFromEntropySize(10);

    await prisma.user.create({
      data: {
        id: userId,
        slack_id: slackId,
        email: identity.primary_email,
        pfpUrl: identity.slack_id ? `https://cachet.dunkirk.sh/users/${identity.slack_id}/r` : 'https://github.com/hackclub.png',
        hasOnboarded: false,
      },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    await getRedisConnection().set(`sessions:${session.id}`, '');
    cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
      },
    });
  } catch (e) {
    console.error(e);
    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}

interface HackClubIdentity {
  id: string;
  slack_id?: string;
  first_name: string;
  last_name: string;
  primary_email: string;
}

interface HackClubUserResponse {
  identity: HackClubIdentity;
}

