import { prisma } from "@hctv/db";
import { validateRequest } from "./validate";

export async function resolveOwnedChannels(id?: string) {
  const { user } = await validateRequest();
  const db = await prisma.user.findUnique({
    where: {
      id: id ?? user?.id,
    },
    select: {
      ownedChannels: true,
      managedChannels: true,
    },
  });
  if (!db) {
    return null;
  }
  
  const channels = [
    ...db.ownedChannels.map((channel) => ({
      ...channel,
      isOwner: true,
    })),
    ...db.managedChannels.map((channel) => ({
      ...channel,
      isOwner: false,
    })),
  ];
  return channels;
}