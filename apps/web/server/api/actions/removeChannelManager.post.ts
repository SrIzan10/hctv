import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId', 'userId']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId, userId } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { owner: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'manage', 'channel', { channel })) {
    return { success: false, error: 'Only channel owners can remove managers' };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      managers: {
        disconnect: { id: userId },
      },
      chatModerators: {
        disconnect: { id: userId },
      },
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
