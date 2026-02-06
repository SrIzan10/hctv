import { prisma } from '@hctv/db';

export type Resource = 'channel' | 'bot' | 'streamInfo';
export type Action = 'read' | 'update' | 'delete' | 'manage';

type User = { id: string };

type ChannelWithRelations = {
  ownerId: string;
  managers?: { id: string }[];
  personalFor?: { id: string } | null;
};

type BotWithRelations = {
  ownerId: string;
};

type PolicyContext = {
  channel?: ChannelWithRelations;
  bot?: BotWithRelations;
};

const policies: Record<Resource, Record<Action, (user: User, ctx: PolicyContext) => boolean>> = {
  channel: {
    read: () => true,
    update: (user, { channel }) => {
      if (!channel) return false;
      return channel.ownerId === user.id || (channel.managers?.some((m) => m.id === user.id) ?? false);
    },
    delete: (user, { channel }) => {
      if (!channel) return false;
      if (channel.personalFor) return false;
      return channel.ownerId === user.id;
    },
    manage: (user, { channel }) => {
      if (!channel) return false;
      return channel.ownerId === user.id;
    },
  },
  bot: {
    read: () => true,
    update: (user, { bot }) => {
      if (!bot) return false;
      return bot.ownerId === user.id;
    },
    delete: (user, { bot }) => {
      if (!bot) return false;
      return bot.ownerId === user.id;
    },
    manage: (user, { bot }) => {
      if (!bot) return false;
      return bot.ownerId === user.id;
    },
  },
  streamInfo: {
    read: () => true,
    update: (user, { channel }) => {
      if (!channel) return false;
      return channel.ownerId === user.id || (channel.managers?.some((m) => m.id === user.id) ?? false);
    },
    delete: () => false,
    manage: (user, { channel }) => {
      if (!channel) return false;
      return channel.ownerId === user.id;
    },
  },
};

export function can(user: User, action: Action, resource: Resource, context: PolicyContext): boolean {
  const policy = policies[resource]?.[action];
  if (!policy) return false;
  return policy(user, context);
}

export async function canAccessChannel(
  user: User,
  action: Action,
  channelId: string
): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { managers: { select: { id: true } }, personalFor: { select: { id: true } } },
  });
  if (!channel) return false;
  return can(user, action, 'channel', { channel });
}

export async function canAccessChannelByName(
  user: User,
  action: Action,
  channelName: string
): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { name: channelName },
    include: { managers: { select: { id: true } }, personalFor: { select: { id: true } } },
  });
  if (!channel) return false;
  return can(user, action, 'channel', { channel });
}

export async function canAccessBot(user: User, action: Action, botId: string): Promise<boolean> {
  const bot = await prisma.botAccount.findUnique({
    where: { id: botId },
    select: { ownerId: true },
  });
  if (!bot) return false;
  return can(user, action, 'bot', { bot });
}

export async function canAccessBotBySlug(
  user: User,
  action: Action,
  slug: string
): Promise<boolean> {
  const bot = await prisma.botAccount.findUnique({
    where: { slug },
    select: { ownerId: true },
  });
  if (!bot) return false;
  return can(user, action, 'bot', { bot });
}
