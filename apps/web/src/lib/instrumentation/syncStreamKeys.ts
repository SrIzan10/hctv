import { prisma, getRedisConnection } from '@hctv/db';

export default async function syncStreamKeys() {
  console.log('Syncing stream keys to Redis...');
  try {
    const keys = await prisma.streamKey.findMany({
      include: {
        channel: true,
      },
    });

    if (keys.length === 0) {
      console.log('No stream keys found to sync.');
      return;
    }

    const redis = getRedisConnection();
    const pipeline = redis.pipeline();

    for (const key of keys) {
      if (key.channel && key.channel.name) {
        pipeline.set(`streamKey:${key.channel.name}`, key.key);
      }
    }

    await pipeline.exec();
    console.log(`Synced ${keys.length} stream keys to Redis`);
  } catch (error) {
    console.error('Failed to sync stream keys to Redis:', error);
  }
}
