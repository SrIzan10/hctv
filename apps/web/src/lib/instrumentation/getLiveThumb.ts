import { prisma } from "@hctv/db";
import { getThumbnailQueue } from "../workers";

export default async function getLiveThumb() {
  const liveChannels = await prisma.streamInfo.findMany({
    where: {
      isLive: true,
    },
    include: {
      channel: true,
    }
  });
  const liveChannelNames = liveChannels.map((channel) => channel.channel.name);

  const thumbQueue = getThumbnailQueue();
  for (const channel of liveChannelNames) {
    await thumbQueue.add("getLiveThumb", {
      name: channel,
    });
  }
}