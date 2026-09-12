import { generateState } from "arctic";
import { hackClub, HCID_AUTH_URL, OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS } from '@hctv/auth';
import { cookies } from "next/headers";

export async function GET(): Promise<Response> {
	const state = generateState();
	const url = hackClub.createAuthorizationURL(HCID_AUTH_URL, state, ['slack_id', 'verification_status', 'email']);

	(await cookies()).set(OAUTH_STATE_COOKIE, state, {
		path: "/",
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		maxAge: OAUTH_STATE_TTL_SECONDS,
		sameSite: "lax"
	});

	return Response.redirect(url);
}
