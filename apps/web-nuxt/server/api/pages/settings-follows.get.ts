import { prisma } from '@hctv/db';

// mirrors the direct Prisma query of settings/follows/page.tsx
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  return prisma.follow.findMany({
    where: { userId: user.id },
    include: { channel: true },
  });
});
