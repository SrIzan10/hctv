import { prisma } from '@hctv/db';

// mirrors the direct Prisma query of settings/bot/page.tsx
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const bots = await prisma.user.findFirst({
    where: { id: user.id },
    select: { botAccounts: true },
  });
  return { botAccounts: bots?.botAccounts ?? [] };
});
