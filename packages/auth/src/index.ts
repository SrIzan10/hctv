import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { Lucia } from 'lucia';
import { prisma } from '@hctv/db';
import { OAuth2Client } from 'arctic';

const adapter = new PrismaAdapter(prisma.session, prisma.user);
export const hackClub = new OAuth2Client(
  process.env.HCID_CLIENT!,
  process.env.HCID_SECRET!,
  process.env.HCID_REDIRECT_URI!
);

export const HCID_AUTH_URL = "https://account.hackclub.com/oauth/authorize";
export const HCID_TOKEN_URL = "https://account.hackclub.com/oauth/token";
export const HCID_USER_INFO_URL = "https://account.hackclub.com/api/v1/me";

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    // this sets cookies with super long expiration
    // since Next.js doesn't allow Lucia to extend cookie expiration when rendering pages
    expires: false,
    attributes: {
      // set to `true` when using HTTPS
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      slack_id: attributes.slack_id,
      email: attributes.email,
      pfpUrl: attributes.pfpUrl,
      hasOnboarded: attributes.hasOnboarded,
      personalChannelId: attributes.personalChannelId,
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  slack_id: string;
  email: string | null;
  pfpUrl: string;
  hasOnboarded: boolean;
  personalChannelId: string | null;
}
