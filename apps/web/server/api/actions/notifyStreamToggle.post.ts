import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelName']);
  if (!args) {
    return { success: false, error: 'From channelName: Invalid input' };
  }

  const followed = await resolveFollowedChannels();
  if (!followed) {
    return { success: false, error: 'No followed channels' };
  }
  const channel = followed.find((f) => f.channel.name === args.channelName);
  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  await prisma.follow.update({
    where: { id: channel.id },
    data: { notifyStream: !channel.notifyStream },
  });

  return { success: true, toggle: !channel.notifyStream };
});
