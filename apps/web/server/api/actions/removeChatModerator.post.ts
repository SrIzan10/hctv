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
    include: { owner: true, managers: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      chatModerators: {
        disconnect: { id: userId },
      },
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
