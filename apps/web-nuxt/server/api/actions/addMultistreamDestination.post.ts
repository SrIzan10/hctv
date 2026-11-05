import { prisma } from '@hctv/db';
import { addMultistreamDestinationSchema } from '~~/shared/schemas/forms';
import { MAX_MULTISTREAM_DESTINATIONS } from '~~/shared/utils/multistream';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(addMultistreamDestinationSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: zod.data.channelId },
    include: {
      managers: true,
      streamInfo: true,
      _count: { select: { multistreamDestinations: true } },
    },
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  if (channel._count.multistreamDestinations >= MAX_MULTISTREAM_DESTINATIONS) {
    return {
      success: false,
      error: `A channel can have up to ${MAX_MULTISTREAM_DESTINATIONS} destinations`,
    };
  }

  const { channelId, ...data } = zod.data;
  await prisma.multistreamDestination.create({
    data: { ...data, channelId },
  });

  const stream = channel.streamInfo[0];
  if (stream?.isLive) {
    await reconcileMultistream(channel.name, stream.streamRegion);
  }

  return { success: true };
});
