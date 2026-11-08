import { prisma } from '@hctv/db';
import { createBotSchema } from '~~/shared/schemas/forms';

export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const zod = await zodVerify(createBotSchema, await readActionBody(event));
  if (!zod.success) {
    return zod;
  }

  const botExists = await prisma.botAccount.findFirst({
    where: { slug: zod.data.slug },
  });
  if (botExists) {
    return { success: false, error: 'Bot slug already exists' };
  }

  const createdBot = await prisma.botAccount.create({
    data: {
      displayName: zod.data.name,
      slug: zod.data.slug,
      ownerId: user.id,
      description: zod.data.description,
      pfpUrl: await genIdenticonUpload(zod.data.slug, 'botpfp'),
    },
  });

  return { success: true, slug: createdBot.slug };
});
