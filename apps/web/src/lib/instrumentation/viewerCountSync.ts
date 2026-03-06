import { getRedisConnection, prisma } from '@hctv/db';
import { setViewerSnapshot, trackWebJob } from '../metrics';

export async function viewerCountSync() {
  try {
    await trackWebJob('viewer_count_sync', async () => {
      const streams = await prisma.streamInfo.findMany({
        where: {
          isLive: true,
        },
        include: {
          channel: true,
        },
      });

      if (streams.length === 0) {
        setViewerSnapshot(0, 0);
        return;
      }

      const redis = getRedisConnection();
      const multi = redis.multi();
      for (const stream of streams) {
        multi.keys(`viewer:${stream.channel.name}:*`);
      }
      const results = await multi.exec();
      let totalViewers = 0;

      await prisma.$transaction(async (tx) => {
        const updates = results?.map((res, index) => {
          const count = Array.isArray(res[1]) ? res[1].length : 0;
          totalViewers += count;
          const stream = streams[index];
          return tx.streamInfo.update({
            where: {
              username: stream.username,
            },
            data: {
              viewers: count,
            },
          });
        });
        await Promise.all(updates || []);
      });

      setViewerSnapshot(totalViewers, streams.length);
    });
  } catch (error) {
    console.error('Error syncing viewer counts:', error);
  }
}
