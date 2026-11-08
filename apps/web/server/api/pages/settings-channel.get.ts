import { prisma } from '@hctv/db';

// settings/channel/[channelName]/page.tsx: ?name=<channelName>
// 401 -> login, 404 -> unknown channel, 403 -> may not update it (page redirects like Next did)
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const { name } = getQuery(event);
  if (typeof name !== 'string' || !name) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const channel = await prisma.channel.findUnique({
    where: { name },
    include: {
      owner: true,
      managers: true,
      chatModerators: true,
      chatModeratorBots: true,
      streamInfo: true,
      streamKey: true,
      chatSettings: true,
      followers: {
        include: {
          user: {
            select: {
              id: true,
              slack_id: true,
            },
          },
        },
      },
      personalFor: true,
    },
  });

  if (!channel) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const isOwner = channel.ownerId === user.id;

  if (!can(user, 'update', 'channel', { channel })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const ownerPersonalChannel = await resolvePersonalChannel(channel.ownerId);
  const managerPersonalChannels = await Promise.all(
    channel.managers.map((manager) => resolvePersonalChannel(manager.id))
  );
  const managerIds = new Set(channel.managers.map((manager) => manager.id));
  const extraChatModerators = channel.chatModerators.filter(
    (moderator) => moderator.id !== channel.ownerId && !managerIds.has(moderator.id)
  );
  const chatModeratorPersonalChannels = await Promise.all(
    extraChatModerators.map((moderator) => resolvePersonalChannel(moderator.id))
  );
  const followerPersonalChannels = await Promise.all(
    channel.followers.map((follower) => resolvePersonalChannel(follower.user.id))
  );
  const allBotAccounts = await prisma.botAccount.findMany({
    select: {
      id: true,
      displayName: true,
      slug: true,
      pfpUrl: true,
    },
    orderBy: {
      slug: 'asc',
    },
  });

  return {
    channel: {
      ...channel,
      chatModerators: extraChatModerators,
      ownerPersonalChannel,
      managerPersonalChannels,
      chatModeratorPersonalChannels,
      followerPersonalChannels,
      allBotAccounts,
    },
    isOwner,
    isPersonal: channel.personalFor !== null,
  };
});
