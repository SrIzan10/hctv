import { prisma, getRedisConnection } from '@hctv/db';
import { updateChatModerationSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(updateChatModerationSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
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

  const blockedTerms = (zod.data.blockedTerms ?? '')
    .split(/[\n,]/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2)
    .slice(0, 200);

  await prisma.chatModerationSettings.upsert({
    where: {
      channelId: channel.id,
    },
    create: {
      channelId: channel.id,
      blockedTerms,
      slowModeSeconds: zod.data.slowModeSeconds,
      maxMessageLength: zod.data.maxMessageLength,
      rateLimitCount: zod.data.rateLimitCount,
      rateLimitWindowSeconds: zod.data.rateLimitWindowSeconds,
    },
    update: {
      blockedTerms,
      slowModeSeconds: zod.data.slowModeSeconds,
      maxMessageLength: zod.data.maxMessageLength,
      rateLimitCount: zod.data.rateLimitCount,
      rateLimitWindowSeconds: zod.data.rateLimitWindowSeconds,
    },
  });

  const redis = getRedisConnection();
  await redis.del(`chat:moderation:settings:${channel.id}`);

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
