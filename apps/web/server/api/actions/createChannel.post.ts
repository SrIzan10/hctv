import { prisma } from '@hctv/db';
import { createChannelSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(createChannelSchema, await readActionBody(event));
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
});
