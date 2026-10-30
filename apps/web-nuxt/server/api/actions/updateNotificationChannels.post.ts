import { prisma } from '@hctv/db';
import { updateNotificationChannelsSchema } from '~~/shared/schemas/forms';
import slackNotifierClient from '../../utils/slack';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(updateNotificationChannelsSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: zod.data.channelId },
    include: {
      owner: true,
      managers: true,
      streamInfo: true,
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  const newDifference = zod.data.channels.filter((c: string) => !channel.notifChannels.includes(c));
  for (const channelId of newDifference) {
    try {
      await slackNotifierClient.chat.postMessage({
        channel: channelId,
        text: `:yay: I'll send livestream notifications for <https://hackclub.tv/${channel.name}|${channel.name}> here from now on!`,
      });
    } catch (error) {
      console.error('Failed to validate Slack notification channel:', error);
      return {
        success: false,
        error: `Failed to send a test notification to ${channelId}. Check that the channel ID is valid and that the bot has access, then try again.`,
      };
    }
  }

  await prisma.channel.updateMany({
    where: { id: channel.id },
    data: { notifChannels: zod.data.channels },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
