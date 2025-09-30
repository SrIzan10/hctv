import {Prisma, prisma} from '@hctv/db';
import {validateRequest} from "@/lib/auth/validate";

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

export async function getBotBySlug(slug: string) {
  const bot = await prisma.botAccount.findFirst({
    where: {
      slug,
    },
  });

  return bot;
}