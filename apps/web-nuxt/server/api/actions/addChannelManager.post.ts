import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId', 'userChannel']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId, userChannel } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId, personalFor: null },
    include: { owner: true, managers: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found OR is personal.' };
  }

  if (!can(user, 'manage', 'channel', { channel })) {
    return { success: false, error: 'Only channel owners can add managers' };
  }

  if (channel.ownerId === userChannel) {
    return { success: false, error: "Owner can't add themselves as managers" };
  }

  const userDb = await resolveUserFromPersonalChannelName(userChannel);
  if (!userDb) {
    return { success: false, error: 'User not found' };
  }
  if (channel.managers.some((m) => m.id === userDb.id)) {
    return { success: false, error: 'User is already a manager' };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      managers: {
        connect: { id: userDb.id },
      },
      chatModerators: {
        connect: { id: userDb.id },
      },
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
