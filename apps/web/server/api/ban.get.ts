import { prisma } from '@hctv/db';

// active (non-expired) ban of the current user, or null; used by the `protected` route middleware
// (port of the ban check in apps/web (protected)/layout.tsx)
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);

  const ban = await prisma.userBan.findUnique({
    where: { userId: user.id },
  });
  if (!ban) return null;

  const isExpired = ban.expiresAt && new Date(ban.expiresAt) < new Date();
  if (isExpired) return null;

  return { reason: ban.reason, expiresAt: ban.expiresAt };
});
