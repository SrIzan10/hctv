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
        setViewerSnapshot({
          hottestStreamViewers: 0,
          streamsWithViewers: 0,
          totalViewers: 0,
          trackedStreams: 0,
          viewersByRegion: {},
        });
        return;
      }

      const redis = getRedisConnection();
      const multi = redis.multi();
      for (const stream of streams) {
        multi.keys(`viewer:${stream.channel.name}:*`);
      }
      const results = await multi.exec();
      let totalViewers = 0;
      let streamsWithViewers = 0;
      let hottestStreamViewers = 0;
      const viewersByRegion: Record<string, number> = {};

      await prisma.$transaction(async (tx) => {
        const updates = results?.map((res, index) => {
          const count = Array.isArray(res[1]) ? res[1].length : 0;
          totalViewers += count;
          if (count > 0) {
            streamsWithViewers += 1;
          }
          if (count > hottestStreamViewers) {
            hottestStreamViewers = count;
          }
          const stream = streams[index];
          viewersByRegion[stream.streamRegion] =
            (viewersByRegion[stream.streamRegion] ?? 0) + count;
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

      setViewerSnapshot({
        hottestStreamViewers,
        streamsWithViewers,
        totalViewers,
        trackedStreams: streams.length,
        viewersByRegion,
      });
    });
  } catch (error) {
    console.error('Error syncing viewer counts:', error);
  }
}
