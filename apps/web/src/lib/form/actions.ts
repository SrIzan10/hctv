'use server';

import { revalidatePath } from 'next/cache';
import { validateRequest } from '../auth';
import prisma from '@hctv/db';
import zodVerify from '../zodVerify';
import { onboardSchema, streamInfoEditSchema } from './zod';
import { initializeStreamInfo } from '../instrumentation/streamInfo';

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

  await fetch(process.env.WELCOME_WORKFLOW_URL!, {
    method: 'POST',
    body: JSON.stringify({
      username: zod.data.username,
    }),
  })

  return { success: true };
}