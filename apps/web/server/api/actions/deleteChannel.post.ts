import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      owner: true,
      personalFor: true,
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'delete', 'channel', { channel })) {
    return {
      success: false,
      error: 'Only channel owners can delete channels (personal channels cannot be deleted)',
    };
  }

  await prisma.channel.delete({
    where: { id: channelId },
  });

  return { success: true };
});
