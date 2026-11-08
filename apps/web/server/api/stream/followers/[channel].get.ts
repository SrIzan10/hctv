import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const channel = getRouterParam(event, 'channel') ?? '';
  try {
    if (!channel) {
      return Response.json({ error: 'channel ID is required' }, { status: 400 });
    }

    const channelId = await resolveChannelNameId(channel);

    const count = await prisma.follow.count({
      where: {
        channelId,
      },
    });

    return Response.json({
      count,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching followers count:', error);
    return Response.json({ error: 'Failed to fetch followers count' }, { status: 500 });
  }
});
