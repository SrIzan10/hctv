import { getRedisConnection, prisma } from '@hctv/db';
import { setViewerSnapshot, trackWebJob } from '../metrics';

async function countViewersForChannel(channelName: string): Promise<number> {
  const redis = getRedisConnection();
  let cursor = '0';
  let total = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      `viewer:${channelName}:*`,
      'COUNT',
      200
    );
    cursor = nextCursor;
    total += keys.length;
  } while (cursor !== '0');

  return total;
}

export async function viewerCountSync() {
  try {
    await trackWebJob('viewer_count_sync', async () => {
      const streams = await prisma.streamInfo.findMany({
        where: {
          isLive: true,
        },
        select: {
          username: true,
          streamRegion: true,
          channel: {
            select: {
              name: true,
            },
          },
        },
      });

      if (streams.length === 0) {
        setViewerSnapshot({
          totalViewers: 0,
          trackedStreams: 0,
          streamsWithViewers: 0,
          hottestStreamViewers: 0,
          viewersByRegion: {},
        });
        return;
      }

      const viewersByRegion: Record<string, number> = {};
      let totalViewers = 0;
      let streamsWithViewers = 0;
      let hottestStreamViewers = 0;

      const streamCounts = await Promise.all(
        streams.map(async (stream) => ({
          stream,
          count: await countViewersForChannel(stream.channel.name),
        }))
      );

      for (const { stream, count } of streamCounts) {
        totalViewers += count;

        if (stream.streamRegion) {
          viewersByRegion[stream.streamRegion] =
            (viewersByRegion[stream.streamRegion] ?? 0) + count;
        }

        if (count > 0) {
          streamsWithViewers += 1;
        }
        if (count > hottestStreamViewers) {
          hottestStreamViewers = count;
        }

        await prisma.streamInfo.update({
          where: {
            username: stream.username,
          },
          data: {
            viewers: count,
          },
        });
      }

      setViewerSnapshot({
        totalViewers,
        trackedStreams: streams.length,
        streamsWithViewers,
        hottestStreamViewers,
        viewersByRegion,
      });
    });
  } catch (error) {
    console.error('Error syncing viewer counts:', error);
  }
}
