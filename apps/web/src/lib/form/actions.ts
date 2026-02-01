'use server';

import { revalidatePath } from 'next/cache';
import { validateRequest } from '@/lib/auth/validate';
import { prisma, getRedisConnection } from '@hctv/db';
import zodVerify from '../zodVerify';
import {
  createBotSchema,
  createChannelSchema,
  changeUsernameSchema,
  editBotSchema,
  onboardSchema,
  streamInfoEditSchema,
  updateChannelSettingsSchema,
} from './zod';
import { initializeStreamInfo } from '../instrumentation/streamInfo';
import {
  resolveFollowedChannels,
  resolveStreamInfo,
  resolveUserFromPersonalChannelName,
} from '../auth/resolve';
import { can, canAccessBot } from '../auth/abac';
import { genIdenticonUpload } from '../utils/genIdenticonUpload';
import { generateStreamKey } from '../db/streamKey';

export async function editStreamInfo(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  const zod = await zodVerify(streamInfoEditSchema, formData);
  if (!zod.success) {
    return zod;
  }

  const channelInfo = await prisma.channel.findUnique({
    where: { name: zod.data.username },
    include: {
      owner: true,
      managers: true,
    },
  });
  if (!channelInfo) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'streamInfo', { channel: channelInfo })) {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.streamInfo
    .update({
      where: { username: zod.data.username },
      data: zod.data,
    })
    .catch((e) => {
      console.error(e);
      return { success: false, error: 'Internal server error' };
    });

  revalidatePath(`/${zod.data.username}`);

  return { success: true };
}

export async function onboard(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  if (user.hasOnboarded) {
    return { success: false, error: 'User has already onboarded' };
  }

  const zod = await zodVerify(onboardSchema, formData);
  if (!zod.success) {
    return zod;
  }

  const channelExists = await prisma.channel.findFirst({
    where: { name: zod.data.username },
  });
  if (channelExists) {
    return { success: false, error: 'Channel name already exists' };
  }

  const createdChannel = await prisma.channel.create({
    data: {
      name: zod.data.username,
      ownerId: user.id,
      personalFor: { connect: { id: user.id } },
      pfpUrl: user.pfpUrl,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      hasOnboarded: true,
      personalChannel: {
        connect: { name: zod.data.username },
      },
    },
  });
  await initializeStreamInfo(createdChannel.id);

  await generateStreamKey(createdChannel.id, createdChannel.name);

  return { success: true };
}

export async function notifyStreamToggle(channelName: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const followed = await resolveFollowedChannels();
  if (!followed) {
    return { success: false, error: 'No followed channels' };
  }
  const channel = followed.find((f) => f.channel.name === channelName);
  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  await prisma.follow.update({
    where: { id: channel.id },
    data: { notifyStream: !channel.notifyStream },
  });

  return { success: true, toggle: !channel.notifyStream };
}

export async function createChannel(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const zod = await zodVerify(createChannelSchema, formData);
  if (!zod.success) {
    return zod;
  }

  const channelExists = await prisma.channel.findFirst({
    where: { name: zod.data.name },
  });
  if (channelExists) {
    return { success: false, error: 'Channel name already exists' };
  }

  const identicon = await genIdenticonUpload(zod.data.name, 'pfp');
  const createdChannel = await prisma.channel.create({
    data: {
      name: zod.data.name,
      ownerId: user.id,
      pfpUrl: identicon,
    },
  });

  await initializeStreamInfo(createdChannel.id);

  await generateStreamKey(createdChannel.id, createdChannel.name);

  return { success: true, channel: createdChannel.name };
}

export async function updateChannelSettings(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const zod = await zodVerify(updateChannelSettingsSchema, formData);
  const urlRegex =
    /(?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
  if (!zod.success) {
    return zod;
  }
  if (zod.data.pfpUrl && !urlRegex.test(zod.data.pfpUrl)) {
    return { success: false, error: 'Invalid URL for profile picture' };
  }

  const channel = await prisma.channel.findUnique({
    where: { id: zod.data.channelId },
    include: {
      owner: true,
      managers: true,
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  if (zod.data.pfpUrl === '') {
    const identicon = await genIdenticonUpload(channel.name, 'pfp');
    zod.data.pfpUrl = identicon;
  }

  await prisma.channel.update({
    where: { id: zod.data.channelId },
    data: {
      description: zod.data.description || undefined,
      pfpUrl: zod.data.pfpUrl,
      is247: zod.data.is247,
    },
  });

  revalidatePath(`/settings/channel/${channel.name}`);
  return { success: true };
}

export async function addChannelManager(channelId: string, userChannel: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

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
    },
  });

  revalidatePath(`/settings/channel/${channel.name}`);
  return { success: true };
}

export async function removeChannelManager(channelId: string, userId: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

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
    },
  });

  revalidatePath(`/settings/channel/${channel.name}`);
  return { success: true };
}

export async function toggleGlobalChannelNotifs(channelId: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

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

  revalidatePath(`/settings/channel/${channel.name}`);

  return { success: true, toggle: !streamInfo.enableNotifications };
}

export async function deleteChannel(channelId: string) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

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
}

export async function createBot(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  const zod = await zodVerify(createBotSchema, formData);
  if (!zod.success) {
    return zod;
  }

  const botExists = await prisma.botAccount.findFirst({
    where: { slug: zod.data.slug },
  });
  if (botExists) {
    return { success: false, error: 'Bot slug already exists' };
  }

  const createdBot = await prisma.botAccount.create({
    data: {
      displayName: zod.data.name,
      slug: zod.data.slug,
      ownerId: user.id,
      description: zod.data.description,
      pfpUrl: await genIdenticonUpload(zod.data.slug, 'botpfp'),
    },
  });

  return { success: true, slug: createdBot.slug };
}

export async function editBot(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  const zod = await zodVerify(editBotSchema, formData);
  if (!zod.success) {
    return zod;
  }

  const bot = await prisma.botAccount.findUnique({
    where: { id: zod.data.from },
  });
  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }
  if (!can(user, 'update', 'bot', { bot })) {
    return { success: false, error: 'Unauthorized' };
  }
  if (bot.slug !== zod.data.slug) {
    const botExists = await prisma.botAccount.findFirst({
      where: { slug: zod.data.slug },
    });
    if (botExists) {
      return { success: false, error: 'Bot slug already exists' };
    }
  }

  const updatedBot = await prisma.botAccount.update({
    where: { id: zod.data.from },
    data: {
      displayName: zod.data.name,
      slug: zod.data.slug,
      description: zod.data.description,
    },
  });

  revalidatePath(`/settings/bot/${updatedBot.slug}`);

  return { success: true, slug: updatedBot.slug };
}

const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export async function changeUsername(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const zod = await zodVerify(changeUsernameSchema, formData);
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

    revalidatePath(`/settings/channel/${newName}`);
    revalidatePath(`/${oldName}`);
    revalidatePath(`/${newName}`);

    return { success: true, newUsername: newName };
  } catch (error) {
    console.error('Failed to change username:', error);
    return { success: false, error: 'Failed to change username. Please try again.' };
  }
}
