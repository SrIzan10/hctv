import { validateRequest } from '@/lib/auth/validate';
import { prisma, getRedisConnection } from '@hctv/db';
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  const body = await request.json();
  const { channel } = body;

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!channel || typeof channel !== 'string') {
    return new Response('Bad Request', { status: 400 });
  }

  const channelInfo = await prisma.channel.findUnique({
    where: { name: channel },
    include: {
      owner: true,
      managers: true
    }
  });

  if (!channelInfo) {
    return new Response('Channel not found', { status: 404 });
  }

  const isBroadcaster = 
    channelInfo.ownerId === user.id || 
    channelInfo.managers.some(m => m.id === user.id);
  if (!isBroadcaster) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbUpdate = await prisma.streamKey.upsert({
    create: {
      key: crypto.randomUUID(),
      channelId: channelInfo.id
    },
    update: {
      key: crypto.randomUUID()
    },
    where: {
      channelId: channelInfo.id
    }
  })

  const redis = getRedisConnection();
  await redis.set(`streamKey:${channel}`, dbUpdate.key);

  return new Response(JSON.stringify({ key: dbUpdate.key }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}