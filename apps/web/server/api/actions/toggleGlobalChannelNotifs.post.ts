import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { followers: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  const streamInfo = await resolveStreamInfo(channelId);
  if (!streamInfo) {
    return { success: false, error: 'Stream info not found' };
  }

  await prisma.streamInfo.update({
    where: {
      id: streamInfo.id,
    },
    data: {
      enableNotifications: !streamInfo.enableNotifications,
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()

  return { success: true, toggle: !streamInfo.enableNotifications };
});
