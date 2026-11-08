import { prisma } from '@hctv/db';
import { updateMultistreamDestinationSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(updateMultistreamDestinationSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const destination = await prisma.multistreamDestination.findUnique({
    where: { id: zod.data.id },
    include: { channel: { include: { managers: true, streamInfo: true } } },
  });

  if (!destination) {
    return { success: false, error: 'Destination not found' };
  }

  const { channel } = destination;
  if (!can(user, 'update', 'channel', { channel })) {
    return { success: false, error: 'Unauthorized' };
  }

  const { id, streamKey, ...rest } = zod.data;
  await prisma.multistreamDestination.update({
    where: { id },
    data: { ...rest, ...(streamKey ? { streamKey } : {}) },
  });

  // an edit or a re-enable is the streamer fixing something, so retry right away
  await clearMultistreamFailure(channel.name, id);

  const stream = channel.streamInfo[0];
  if (stream?.isLive) {
    await reconcileMultistream(channel.name, stream.streamRegion);
  }

  return { success: true };
});
