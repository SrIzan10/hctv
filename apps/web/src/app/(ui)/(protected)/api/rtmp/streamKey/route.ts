import { NextRequest } from 'next/server';
import { validateRequest } from '@/lib/auth/validate';
import { regenerateStreamKey } from '@/lib/db/streamKey';
import { prisma } from '@hctv/db';

export async function POST(request: NextRequest) {
  const channelName = await readChannelNameFromBody(request);

  if (!channelName) {
    return badRequestResponse();
  }

  const result = await getAuthorizedChannel(channelName);
  if ('response' in result) {
    return result.response;
  }

  const streamKey = await regenerateStreamKey(result.channel.id, channelName);
  return Response.json({ key: streamKey.key });
}

export async function GET(request: NextRequest) {
  const channelName = request.nextUrl.searchParams.get('channel');

  if (!isValidChannelName(channelName)) {
    return badRequestResponse();
  }

  const result = await getAuthorizedChannel(channelName);
  if ('response' in result) {
    return result.response;
  }

  const streamKey = await prisma.streamKey.findUnique({
    where: { channelId: result.channel.id },
    select: { key: true },
  });

  if (!streamKey) {
    return new Response('Stream key not found', { status: 404 });
  }

  return Response.json({ key: streamKey.key });
}

async function getAuthorizedChannel(channelName: string): Promise<AuthorizedChannelResult> {
  const { user } = await validateRequest();

  if (!user) {
    return { response: unauthorizedResponse() };
  }

  const channel = await prisma.channel.findUnique({
    where: { name: channelName },
    select: {
      id: true,
      ownerId: true,
      managers: {
        where: { id: user.id },
        select: { id: true },
      },
    },
  });

  if (!channel) {
    return { response: new Response('Channel not found', { status: 404 }) };
  }

  const isBroadcaster = channel.ownerId === user.id || channel.managers.length > 0;
  if (!isBroadcaster) {
    return { response: unauthorizedResponse() };
  }

  return { channel: { id: channel.id } };
}

async function readChannelNameFromBody(request: NextRequest) {
  try {
    const body = await request.json();
    return isValidChannelName(body?.channel) ? body.channel : null;
  } catch {
    return null;
  }
}

function isValidChannelName(channelName: unknown): channelName is string {
  return typeof channelName === 'string' && channelName.length > 0;
}

function badRequestResponse() {
  return new Response('Bad Request', { status: 400 });
}

function unauthorizedResponse() {
  return new Response('Unauthorized', { status: 401 });
}

type AuthorizedChannelResult =
  | {
      channel: {
        id: string;
      };
    }
  | {
      response: Response;
    };
