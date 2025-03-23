import { prisma } from '@hctv/db';

export async function resolveChannelNameId(channelName: string) {
  const channel = await prisma.channel.findUnique({
    where: {
      name: channelName,
    },
  });

  if (!channel) {
    return '';
  }

  return channel.id;
}

export async function resolveUserPersonalChannel(userId: string) {
  const channel = await prisma.channel.findFirst({
    where: {
      personalFor: {
        id: userId,
      },
    },
  });

  if (!channel) {
    return null;
  }

  return channel;
}