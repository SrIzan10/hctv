import { prisma } from '@hctv/db';

export async function getPersonalChannel(id?: string) {
  // only touch the request when no id is given: this is also called from the chat websocket,
  // where there is no http event to resolve a session from
  const userId = id ?? (await validateRequest()).user?.id;
  const db = await prisma.user.findUnique({
    where: {
      id: userId,
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
