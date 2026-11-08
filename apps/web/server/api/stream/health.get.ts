import { prisma } from '@hctv/db';
import type { StreamHealthReport } from '#shared/types/streamHealth';

// ?channel=<name>: checks of the channel's live encoder settings, for its owner and managers
export default defineEventHandler(async (event): Promise<StreamHealthReport> => {
  const { user } = await requireUser(event);
  const { channel: channelName } = getQuery(event);
  if (typeof channelName !== 'string' || !channelName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing channel' });
  }

  const channel = await prisma.channel.findUnique({
    where: { name: channelName },
    include: {
      managers: { select: { id: true } },
      streamInfo: { select: { isLive: true, streamRegion: true } },
    },
  });

  if (!channel) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  if (!can(user, 'update', 'channel', { channel })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const stream = channel.streamInfo[0];
  if (!stream?.isLive) {
    return { isLive: false, checks: [] };
  }

  return getStreamHealth(channel.name, stream.streamRegion);
});
