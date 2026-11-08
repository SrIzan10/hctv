import { prisma } from '@hctv/db';
import { updateChannelSettingsSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const zod = await zodVerify(updateChannelSettingsSchema, await readActionBody(event));
  const urlRegex =
    /(?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
  if (!zod.success) {
    return zod;
  }
  if (zod.data.pfpUrl && !urlRegex.test(zod.data.pfpUrl)) {
    return { success: false, error: 'Invalid URL for profile picture' };
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

  if (zod.data.pfpUrl === '') {
    const identicon = await genIdenticonUpload(channel.name, 'pfp');
    zod.data.pfpUrl = identicon;
  }

  await prisma.channel.update({
    where: { id: zod.data.channelId },
    data: {
      description: zod.data.description || undefined,
      pfpUrl: zod.data.pfpUrl,
      is247: zod.data.is247,
    },
  });

  // revalidatePath(`/settings/channel/${channel.name}`) dropped: client refreshes via refreshNuxtData()
  return { success: true };
});
