import { getRedisConnection, prisma } from "@hctv/db";

export async function viewerCountSync() {
  const streams = await prisma.streamInfo.findMany({
    include: {
      channel: true
    }
  })
  const redis = getRedisConnection();

  for (const stream of streams) {
    const viewerCount = await redis.keys(`viewer:${stream.channel.name}:*`);
    await prisma.streamInfo.update({
      where: {
        username: stream.username,
      },
      data: {
        viewers: viewerCount.length,
      },
    });
  }
}