import { prisma } from '@hctv/db';

const RECENT_FOLLOWERS = 20;

// /dashboard/[username] (stream manager): ?name=<channel>
// 401 -> login, 404 -> unknown channel, 403 -> may not manage it
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const { name } = getQuery(event);
  if (typeof name !== 'string' || !name) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const channel = await prisma.channel.findUnique({
    where: { name },
    include: {
      managers: { select: { id: true } },
      streamInfo: {
        select: { username: true, title: true, category: true, streamRegion: true },
      },
      _count: { select: { followers: true } },
    },
  });

  if (!channel) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  if (!can(user, 'update', 'channel', { channel })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const recentFollows = await prisma.follow.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: 'desc' },
    take: RECENT_FOLLOWERS,
    select: {
      id: true,
      createdAt: true,
      user: { select: { personalChannel: { select: { name: true, pfpUrl: true } } } },
    },
  });

  const stream = channel.streamInfo[0];

  return {
    channel: {
      id: channel.id,
      name: channel.name,
      pfpUrl: channel.pfpUrl,
      is247: channel.is247,
    },
    stream: stream
      ? {
          username: stream.username,
          title: stream.title,
          category: stream.category,
          region: stream.streamRegion,
        }
      : null,
    followerCount: channel._count.followers,
    recentFollowers: recentFollows
      .filter((follow) => follow.user.personalChannel)
      .map((follow) => ({
        id: follow.id,
        followedAt: follow.createdAt,
        name: follow.user.personalChannel!.name,
        pfpUrl: follow.user.personalChannel!.pfpUrl,
      })),
  };
});
