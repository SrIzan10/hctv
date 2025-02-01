import { validateRequest } from '@/lib/auth';
import { AccessToken } from 'livekit-server-sdk';
import { NextRequest } from 'next/server';
import { randomString } from 'util-utils';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  const userSalt = randomString(8);
  const room = request.nextUrl.searchParams.get('room');
  if (!room) {
    return new Response('Room is required', { status: 400 });
  }
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET, {
    identity: `${user.id}-${userSalt}`,
    name: `${user.username}-${userSalt}`,
    ttl: 3600,
  });

  at.addGrant({
    room,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false,
  });

  return Response.json({ token: await at.toJwt() });
}
