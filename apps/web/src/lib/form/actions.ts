'use server';

import { revalidatePath } from 'next/cache';
import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import zodVerify from '../zodVerify';
import { createChannelSchema, onboardSchema, streamInfoEditSchema, updateChannelSettingsSchema } from './zod';
import { initializeStreamInfo } from '../instrumentation/streamInfo';
import { resolveFollowedChannels, resolveStreamInfo, resolveUserFromPersonalChannelName } from '../auth/resolve';
import { genIdenticonUpload } from '../utils/genIdenticonUpload';

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

  const isBroadcaster =
    channelInfo.ownerId === user.id || channelInfo.managers.some((m) => m.id === user.id);
  if (!isBroadcaster) {
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
    }
  })
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

  if (process.env.NODE_ENV === 'production') {
    await fetch(process.env.WELCOME_WORKFLOW_URL!, {
      method: 'POST',
      body: JSON.stringify({
        username: zod.data.username,
      }),
    })
  }

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
    }
  });

  await initializeStreamInfo(createdChannel.id);

  return { success: true };
}

export async function updateChannelSettings(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  
  const zod = await zodVerify(updateChannelSettingsSchema, formData);
  const urlRegex = /(?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
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

  const isOwner = channel.ownerId === user.id;
  const isManager = channel.managers.some(manager => manager.id === user.id);

  if (!isOwner && !isManager) {
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

  if (channel.ownerId !== user.id) {
    return { success: false, error: 'Only channel owners can add managers' };
  }

  if (channel.ownerId === userChannel) {
    return { success: false, error: 'Owner can\'t add themselves as managers' };
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

  if (channel.ownerId !== user.id) {
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
    }
  })

  revalidatePath(`/settings/channel/${channel.name}`);

  return { success: true, toggle: !streamInfo.enableNotifications };
}

export async function deleteChannel(channelId: string) {
  return { success: false, error: 'disabled atm. dm @eth0 if you want to request a deletion.' }
  /* const { user } = await validateRequest();
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

  if (channel.ownerId !== user.id) {
    return { success: false, error: 'Only channel owners can delete channels' };
  }

  // Prevent deletion of personal channels
  if (channel.personalFor) {
    return { success: false, error: 'Cannot delete personal channels' };
  }

  await prisma.channel.delete({
    where: { id: channelId },
  });

  return { success: true }; */
}