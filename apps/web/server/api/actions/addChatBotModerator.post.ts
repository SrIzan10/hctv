import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const args = pickStrings(await readActionBody(event), ['channelId', 'botId']);
  if (!args) {
    return { success: false, error: 'Invalid input' };
  }
  const { channelId, botId } = args;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { owner: true, managers: true, chatModeratorBots: true },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  const bot = await prisma.botAccount.findUnique({
    where: { id: botId },
    select: { id: true },
  });

  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }

  if (channel.chatModeratorBots.some((existingBot) => existingBot.id === bot.id)) {
    return { success: false, error: 'Bot is already a chat moderator' };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      chatModeratorBots: {
        connect: { id: bot.id },
      },
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
