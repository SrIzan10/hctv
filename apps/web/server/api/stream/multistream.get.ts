import { prisma } from '@hctv/db';
import { maskStreamKey } from '~~/shared/utils/multistream';

// ?channel=<name>: the channel's multistream destinations (keys masked) and, while live,
// what hctvmtx reports for each of them
export default defineEventHandler(async (event) => {
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
      multistreamDestinations: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!channel) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  if (!can(user, 'update', 'channel', { channel })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const stream = channel.streamInfo[0];
  const isLive = stream?.isLive ?? false;
  const statuses = await getMultistreamStatuses(
    channel.name,
    stream?.streamRegion ?? 'hq',
    isLive,
    channel.multistreamDestinations
  );

  return {
    isLive,
    destinations: channel.multistreamDestinations.map((destination) => ({
      id: destination.id,
      platform: destination.platform,
      name: destination.name,
      serverUrl: destination.serverUrl,
      maskedKey: maskStreamKey(destination.streamKey),
      enabled: destination.enabled,
      status: statuses[destination.id] ?? { state: 'offline' },
    })),
  };
});
