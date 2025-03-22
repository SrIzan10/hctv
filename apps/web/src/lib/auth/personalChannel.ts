import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';

export async function getPersonalChannel(id?: string) {
  const { user } = await validateRequest();
  const db = await prisma.user.findUnique({
    where: {
      id: id ?? user?.id,
    },
    select: {
      personalChannel: true,
    },
  });
  if (!db) {
    return null;
  }
  return db.personalChannel;
}
