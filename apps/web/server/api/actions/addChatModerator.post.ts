import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId', 'userChannel']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId, userChannel } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { owner: true, managers: true, chatModerators: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  const userDb = await resolveUserFromPersonalChannelName(userChannel);
  if (!userDb) {
    return { success: false, error: 'User not found' };
  }

  if (
    channel.ownerId === userDb.id ||
    channel.managers.some((manager) => manager.id === userDb.id)
  ) {
    return { success: false, error: 'This user is already a built-in moderator' };
  }

  if (channel.chatModerators.some((moderator) => moderator.id === userDb.id)) {
    return { success: false, error: 'User is already a chat moderator' };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      chatModerators: {
        connect: { id: userDb.id },
      },
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
