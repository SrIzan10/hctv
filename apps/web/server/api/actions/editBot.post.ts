import { prisma } from '@hctv/db';
import { editBotSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const zod = await zodVerify(editBotSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const bot = await prisma.botAccount.findUnique({
    where: { id: zod.data.from },
  });
  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }
  if (!can(user, 'update', 'bot', { bot })) {
    return { success: false, error: 'Unauthorized' };
  }
  if (bot.slug !== zod.data.slug) {
    const botExists = await prisma.botAccount.findFirst({
      where: { slug: zod.data.slug },
    });
    if (botExists) {
      return { success: false, error: 'Bot slug already exists' };
    }
  }

  if (zod.data.pfpUrl === '') {
    const identicon = await genIdenticonUpload(zod.data.name, 'pfp');
    zod.data.pfpUrl = identicon;
  }

  const updatedBot = await prisma.botAccount.update({
    where: { id: zod.data.from },
    data: {
      displayName: zod.data.name,
      slug: zod.data.slug,
      description: zod.data.description,
      pfpUrl: zod.data.pfpUrl,
    },
  });

  // revalidatePath(`/settings/bot/${updatedBot.slug}`) dropped: client refreshes via refreshNuxtData()

  return { success: true, slug: updatedBot.slug };
});
