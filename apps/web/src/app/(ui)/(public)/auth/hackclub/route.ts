import { generateState } from "arctic";
import { hackClub, HCID_AUTH_URL } from '@hctv/auth';
import { cookies } from "next/headers";

export async function GET(): Promise<Response> {
	const state = generateState();
	const url = hackClub.createAuthorizationURL(HCID_AUTH_URL, state, ['slack_id', 'verification_status', 'email']);

	(await cookies()).set("hackclub_oauth_state", state, {
		path: "/",
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	return Response.redirect(url);
}
