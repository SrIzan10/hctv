import { prisma } from '@hctv/db';
import { streamInfoEditSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const zod = await zodVerify(streamInfoEditSchema, await readActionBody(event));
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

  if (!can(user, 'update', 'streamInfo', { channel: channelInfo })) {
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

  // revalidatePath(`/${username}`) dropped: client refreshes via refreshNuxtData()

  return { success: true };
});
