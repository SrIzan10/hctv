import { prisma } from '@hctv/db';

// (protected)/[username]/page.tsx and (other)/chat/[username]/page.tsx server data.
// always 200: `status` tells the page which state to render.
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username');
  if (!username) {
    return { status: 'notFound' as const };
  }

  const { user } = await validateRequest(event);
  const streamInfo = await prisma.streamInfo.findUnique({
    where: { username },
    include: { channel: { include: { restriction: true } } },
  });
  if (!streamInfo) {
    return { status: 'notFound' as const };
  }

  const { restriction, obsChatGrantToken: _grant, ...channel } = streamInfo.channel;
  const hasActiveRestriction = restriction
    ? !restriction.expiresAt || new Date(restriction.expiresAt) >= new Date()
    : false;
  const canViewRestrictedStream = Boolean(user?.isAdmin);

  if (hasActiveRestriction && !canViewRestrictedStream) {
    return { status: 'restricted' as const };
  }

  return {
    status: 'ok' as const,
    streamInfo: { ...streamInfo, channel },
    canViewRestrictedStream,
    initialRestrictionActive: hasActiveRestriction,
    initialRestrictionExpiresAt: restriction?.expiresAt?.toISOString() ?? null,
  };
});
