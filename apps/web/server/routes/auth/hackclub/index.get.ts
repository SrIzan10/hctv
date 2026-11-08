import { generateState } from 'arctic';
import { hackClub, HCID_AUTH_URL, OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS } from '@hctv/auth';

export default defineEventHandler((event) => {
  const state = generateState();
  const url = hackClub.createAuthorizationURL(HCID_AUTH_URL, state, [
    'slack_id',
    'verification_status',
    'email',
  ]);

  setCookie(event, OAUTH_STATE_COOKIE, state, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: OAUTH_STATE_TTL_SECONDS,
    sameSite: 'lax',
  });

  return sendRedirect(event, url.toString(), 302);
});
