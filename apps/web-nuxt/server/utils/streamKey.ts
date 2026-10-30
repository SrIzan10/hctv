import { prisma, getRedisConnection } from '@hctv/db';

export async function generateStreamKey(channelId: string, channelName: string) {
  const streamKey = await prisma.streamKey.create({
    data: {
      key: crypto.randomUUID(),
      channelId,
    },
  });

  const redis = getRedisConnection();
  await redis.set(`streamKey:${channelName}`, streamKey.key);

  return streamKey;
}

export async function regenerateStreamKey(channelId: string, channelName: string) {
  const streamKey = await prisma.streamKey.upsert({
    create: {
      key: crypto.randomUUID(),
      channelId,
    },
    update: {
      key: crypto.randomUUID(),
    },
    where: {
      channelId,
    },
  });

  const redis = getRedisConnection();
  await redis.set(`streamKey:${channelName}`, streamKey.key);

  return streamKey;
}
