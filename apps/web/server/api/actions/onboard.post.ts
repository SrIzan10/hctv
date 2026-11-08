import { prisma } from '@hctv/db';
import { onboardSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  if (user.hasOnboarded) {
    return { success: false, error: 'User has already onboarded' };
  }

  const zod = await zodVerify(onboardSchema, await readActionBody(event));
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

  if (process.env.NODE_ENV === 'production' && process.env.WELCOME_WORKFLOW_URL) {
    await fetch(process.env.WELCOME_WORKFLOW_URL, {
      method: 'POST',
      body: JSON.stringify({
        username: zod.data.username,
      }),
    });
  }

  return { success: true };
});
