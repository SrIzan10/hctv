import { prisma } from "@hctv/db";

export async function getPersonalChannel(id: string) {
  const db = await prisma.user.findUnique({
    where: {
      id,
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