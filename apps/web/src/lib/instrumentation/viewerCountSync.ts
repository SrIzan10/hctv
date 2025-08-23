import { getRedisConnection, prisma } from "@hctv/db";

export async function viewerCountSync() {
  const streams = await prisma.streamInfo.findMany({
    where: {
      isLive: true
    },
    include: {
      channel: true
    }
  })

  if (streams.length === 0) {
    return;
  }

  const redis = getRedisConnection();
  const multi = redis.multi();
  for (const stream of streams) {
    multi.keys(`viewer:${stream.channel.name}:*`);
  }
  const results = await multi.exec();

  await prisma.$transaction(async (tx) => {
    const updates = results?.map((res, index) => {
      const count = Array.isArray(res[1]) ? res[1].length : 0;
      const stream = streams[index];
      return tx.streamInfo.update({
        where: {
          // using username here because it uses a map
          username: stream.username
        },
        data: {
          viewers: count
        }
      })
    })
    await Promise.all(updates || []);
  })
}