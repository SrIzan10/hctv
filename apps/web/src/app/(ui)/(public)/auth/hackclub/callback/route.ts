import slackNotifier from '@/lib/services/slackNotifier';
import { hackClub, lucia, HCID_TOKEN_URL, HCID_USER_INFO_URL } from '@hctv/auth';
import { cookies as nextCookies } from 'next/headers';
import { OAuth2RequestError } from 'arctic';
import { generateIdFromEntropySize } from 'lucia';
import { prisma } from '@hctv/db';
import { getRedisConnection } from '@hctv/db';

export async function GET(request: Request): Promise<Response> {
  const cookies = await nextCookies();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('hackclub_oauth_state')?.value ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    console.log('invalid state stuff');
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await hackClub.validateAuthorizationCode(HCID_TOKEN_URL, code, null);
    const accessToken = tokens.accessToken();
    const userResponse = await fetch(HCID_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return new Response('Unable to verify your Hack Club identity right now. Please try again.', {
        status: 502,
      });
    }

    const userResult: HackClubUserResponse = await userResponse.json();
    const identity = userResult.identity;
    const bypass = await checkIfBypass(identity.primary_email);

    if (identity.verification_status !== 'verified') {
      if (!bypass) {
        return new Response(getVerificationErrorMessage(identity.verification_status), {
          status: 403,
        });
      }
    }

    const slackId = identity.slack_id;
    if (!slackId) {
      return new Response('Please make sure to have a Slack account before continuing.', {
        status: 400,
      });
    }

    const slackValidation = await validateSlackUser(slackId);
    if (!slackValidation.success) {
      if (!bypass) {
        return new Response(slackValidation.message, {
          status: slackValidation.status,
        });
      }
    }

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
        pfpUrl: identity.slack_id
          ? `https://cachet.dunkirk.sh/users/${identity.slack_id}/r`
          : 'https://github.com/hackclub.png',
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
  verification_status: VerificationStatus;
}

interface HackClubUserResponse {
  identity: HackClubIdentity;
}

type VerificationStatus = 'needs_submission' | 'pending' | 'verified' | 'ineligible';

type SlackValidationResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
      status: number;
    };

function getVerificationErrorMessage(status: VerificationStatus): string {
  switch (status) {
    case 'needs_submission':
      return 'Please complete Hack Club Identity verification before signing in to hackclub.tv.';
    case 'pending':
      return 'Your Hack Club Identity verification is still being reviewed. Please try again once it is approved.';
    case 'ineligible':
      return 'Your Hack Club Identity verification was rejected, so you cannot access hackclub.tv right now.';
    case 'verified':
      return 'Verified users can continue.';
  }
}

async function validateSlackUser(slackId: string): Promise<SlackValidationResult> {
  if (!process.env.SLACK_NOTIFIER_TOKEN) {
    return {
      success: false,
      message: 'Slack verification is not configured right now. Please try again later.',
      status: 503,
    };
  }

  try {
    const response = await slackNotifier.users.info({ user: slackId });
    if (!response.ok || !response.user) {
      return {
        success: false,
        message: 'Unable to verify your Slack account right now. Please try again later.',
        status: 502,
      };
    }

    if (response.user.deleted) {
      return {
        success: false,
        message: 'Your Slack account is deactivated, so you cannot access hackclub.tv.',
        status: 403,
      };
    }

    if (response.user.is_restricted || response.user.is_ultra_restricted) {
      return {
        success: false,
        message:
          'Guest Slack accounts cannot access hackclub.tv. Please sign in with a full Hack Club Slack account.',
        status: 403,
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      message: 'Unable to verify your Slack account right now. Please try again later.',
      status: 502,
    };
  }
}

async function checkIfBypass(email: string): Promise<boolean> {
  const user = await prisma.user.findFirst({ where: { email } });
  return user?.bypassVerification ?? false;
}
