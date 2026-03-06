import { prisma } from '@hctv/db';
import { recordThumbnailJobsEnqueued, trackWebJob } from '../metrics';
import { getThumbnailQueue } from '../workers';

export default async function getLiveThumb() {
  return trackWebJob('thumbnail_refresh', async () => {
    const liveChannels = await prisma.streamInfo.findMany({
      where: {
        isLive: true,
      },
      include: {
        channel: true,
      },
    });
    const thumbQueue = getThumbnailQueue();
    const jobsByRegion: Record<string, number> = {};

    for (const liveChannel of liveChannels) {
      await thumbQueue.add('getLiveThumb', {
        name: liveChannel.channel.name,
        server: liveChannel.streamRegion,
      });
      jobsByRegion[liveChannel.streamRegion] = (jobsByRegion[liveChannel.streamRegion] ?? 0) + 1;
    }

    recordThumbnailJobsEnqueued(jobsByRegion);
  });
}
