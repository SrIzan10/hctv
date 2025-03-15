import prisma from '@/lib/db';
import { HttpFlv } from '../types/liveBackendJson';

export default async function runner() {
  // if there are no users it explodes so yeah
  if ((await prisma.user.count()) === 0) {
    return;
  }
  await initializeStreamInfo();
  await syncStream();
  setInterval(syncStream, 5000);
}

export async function initializeStreamInfo(channelId?: string) {
  const channels = await prisma.channel.findMany({
    where: {
      id: channelId,
    },
    include: {
      streamInfo: true,
    },
  });

  for (const channel of channels) {
    if (!channel.streamInfo.length) {
      await prisma.streamInfo.create({
        data: {
          username: channel.name,
          title: 'Untitled',
          category: 'Uncategorized',
          startedAt: new Date(0),
          thumbnail: 'https://picsum.photos/600/400',
          viewers: 0,
          isLive: false,
          channel: {
            connect: { id: channel.id },
          },
          ownedBy: {
            connect: { id: channel.ownerId },
          },
        },
      });
    }
  }
}

export async function syncStream() {
  const request = (
    await (
      await fetch(`${process.env.LIVE_SERVER_URL}/stat`, {
        headers: {
          Authorization: process.env.STAT_AUTH!,
        },
      })
    ).json()
  )['http-flv'] as HttpFlv;

  const rooms = request.servers[0].applications.filter(app => app.name === 'channel-live')[0].live.streams;

  // process each room
  for (const room of rooms) {
    const isLive = room.active;
    const originalStreamInfo = await prisma.streamInfo.findUnique({
      where: { username: room.name },
    });

    // upsert stream info
    await prisma.streamInfo.upsert({
      where: {
        username: room.name,
      },
      create: {
        username: room.name,
        title: 'Untitled',
        category: 'Uncategorized',
        startedAt: new Date(),
        thumbnail: 'https://picsum.photos/600/400',
        viewers: 0,
        channel: {
          connect: { id: room.name },
        },
        isLive,
        ownedBy: {
          connect: { id: room.name },
        },
      },
      update: {
        isLive,
        viewers: room.clients.filter(c => !c.publishing).length,
        startedAt: !isLive
          ? new Date(0)
          : originalStreamInfo?.isLive
          ? originalStreamInfo.startedAt
          : new Date(),
      },
    });
  }
}
