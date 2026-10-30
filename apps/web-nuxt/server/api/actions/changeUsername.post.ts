import { prisma, getRedisConnection } from '@hctv/db';
import { changeUsernameSchema } from '~~/shared/schemas/forms';

const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(changeUsernameSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: zod.data.channelId },
    include: {
      owner: true,
      managers: true,
      personalFor: true,
      streamInfo: true,
      streamKey: true,
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!channel.personalFor || channel.personalFor.id !== user.id) {
    return { success: false, error: 'You can only change the username of your personal channel' };
  }

  if (channel.ownerId !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (channel.nameLastChanged) {
    const daysSinceLastChange = Math.floor(
      (Date.now() - new Date(channel.nameLastChanged).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastChange < USERNAME_CHANGE_COOLDOWN_DAYS) {
      const daysRemaining = USERNAME_CHANGE_COOLDOWN_DAYS - daysSinceLastChange;
      return {
        success: false,
        error: `Please wait ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`,
      };
    }
  }

  const oldName = channel.name;
  const newName = zod.data.newUsername;

  if (oldName === newName) {
    return { success: false, error: 'New username must be different from the current one' };
  }

  const existingChannel = await prisma.channel.findUnique({
    where: { name: newName },
  });
  if (existingChannel) {
    return { success: false, error: 'This username is already taken' };
  }

  const redis = getRedisConnection();

  try {
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        name: newName,
        nameLastChanged: process.env.NODE_ENV === 'production' ? new Date() : null,
      },
    });

    if (channel.streamInfo.length > 0) {
      await prisma.streamInfo.updateMany({
        where: { channelId: channel.id },
        data: { username: newName },
      });
    }

    if (channel.streamKey) {
      const oldStreamKey = `streamKey:${oldName}`;
      const newStreamKey = `streamKey:${newName}`;
      if (await redis.exists(oldStreamKey)) {
        await redis.rename(oldStreamKey, newStreamKey);
      }
    }

    const oldHistoryKey = `chat:history:${oldName}`;
    const newHistoryKey = `chat:history:${newName}`;
    if (await redis.exists(oldHistoryKey)) {
      const messagesWithScores = await redis.zrange(oldHistoryKey, 0, -1, 'WITHSCORES');
      if (messagesWithScores.length > 0) {
        const args: (string | number)[] = [];
        for (let i = 0; i < messagesWithScores.length; i += 2) {
          const msgStr = messagesWithScores[i];
          const score = messagesWithScores[i + 1];
          try {
            const msg = JSON.parse(msgStr);
            msg.user.username = newName;
            args.push(score, JSON.stringify(msg));
          } catch {
            args.push(score, msgStr);
          }
        }
        await redis.zadd(newHistoryKey, ...args);
      }
      await redis.del(oldHistoryKey);
    }

    // revalidatePath calls for settings/channel/<new>, /<old>, /<new> dropped: client refreshes

    return { success: true, newUsername: newName };
  } catch (error) {
    console.error('Failed to change username:', error);
    return { success: false, error: 'Failed to change username. Please try again.' };
  }
});
