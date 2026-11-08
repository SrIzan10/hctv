import { prisma } from '@hctv/db';
import { removeMultistreamDestinationSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(removeMultistreamDestinationSchema, await readActionBody(event));
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

  await prisma.multistreamDestination.delete({ where: { id: destination.id } });
  await clearMultistreamFailure(channel.name, destination.id);

  // the reconciler stops forwards whose destination no longer exists
  const stream = channel.streamInfo[0];
  if (stream?.isLive) {
    await reconcileMultistream(channel.name, stream.streamRegion);
  }

  return { success: true };
});
