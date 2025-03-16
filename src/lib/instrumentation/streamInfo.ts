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
  try {
    const response = await fetch(`${process.env.LIVE_SERVER_URL}/stat`, {
      headers: {
        Authorization: process.env.STAT_AUTH!,
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch stream stats: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const httpFlv = data['http-flv'] as HttpFlv;
    
    if (!httpFlv?.servers?.[0]?.applications) {
      return;
    }
    
    const channelLiveApp = httpFlv.servers[0].applications.find(app => app.name === 'channel-live');
    const activeStreams = channelLiveApp?.live?.streams || [];
    
    const currentLiveStreams = await prisma.streamInfo.findMany({
      where: { isLive: true },
    });

    const activeStreamMap = new Map();
    for (const stream of activeStreams) {
      activeStreamMap.set(stream.name, {
        isLive: stream.active,
        viewers: stream.clients.filter(c => !c.publishing).length,
      });
    }
    
    for (const dbStream of currentLiveStreams) {
      const streamStats = activeStreamMap.get(dbStream.username);
      
      if (!streamStats || !streamStats.isLive) {
        await prisma.streamInfo.update({
          where: { username: dbStream.username },
          data: {
            isLive: false,
            viewers: 0,
            startedAt: new Date(0),
          },
        });
      }
    }
    
    for (const stream of activeStreams) {
      if (stream.active) {
        const existingStream = await prisma.streamInfo.findUnique({
          where: { username: stream.name },
        });
        
        if (existingStream && !existingStream.isLive) {
          await prisma.streamInfo.update({
            where: { username: stream.name },
            data: {
              isLive: true,
              startedAt: new Date(),
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error syncing stream status:", error);
  }
}