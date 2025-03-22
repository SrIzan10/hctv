import { slack, lucia } from '@hctv/auth';
import { cookies as nextCookies } from 'next/headers';
import { decodeIdToken, OAuth2RequestError } from 'arctic';
import { generateIdFromEntropySize } from 'lucia';
import prisma from '@hctv/db';

export async function GET(request: Request): Promise<Response> {
  const cookies = await nextCookies();
  const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedState = cookies.get("slack_oauth_state")?.value ?? null;
	if (!code || !state || !storedState || state !== storedState) {
    console.log('invalid state stuff');
		return new Response(null, {
			status: 400
		});
	}

  try {
    const tokens = await slack.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken()
    const slackUserResponse = await fetch('https://slack.com/api/openid.connect.userInfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const slackUser: SlackUserInfo = await slackUserResponse.json();

    const existingUser = await prisma.user.findFirst({
      where: {
        slack_id: slackUser.sub,
      },
    });

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
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
        slack_id: slackUser.sub,
        pfpUrl: slackUser.picture,
        hasOnboarded: false,
      },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
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

interface SlackUserInfo {
  // OpenID Connect standard fields
  ok: boolean;
  sub: string;
  email: string;
  email_verified: boolean;
  date_email_verified: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;

  // Slack-specific fields
  ['https://slack.com/user_id']: string;
  ['https://slack.com/team_id']: string;
  ['https://slack.com/team_name']: string;
  ['https://slack.com/team_domain']: string;

  // User image URLs
  ['https://slack.com/user_image_24']: string;
  ['https://slack.com/user_image_32']: string;
  ['https://slack.com/user_image_48']: string;
  ['https://slack.com/user_image_72']: string;
  ['https://slack.com/user_image_192']: string;
  ['https://slack.com/user_image_512']: string;

  // Team image URLs
  ['https://slack.com/team_image_34']?: string;
  ['https://slack.com/team_image_44']?: string;
  ['https://slack.com/team_image_68']?: string;
  ['https://slack.com/team_image_88']?: string;
  ['https://slack.com/team_image_102']?: string;
  ['https://slack.com/team_image_132']?: string;
  ['https://slack.com/team_image_230']?: string;
  ['https://slack.com/team_image_default']?: boolean;
}
