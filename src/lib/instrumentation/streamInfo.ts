import prisma from "@/lib/db";
import { roomService } from "@/lib/services/livekit";

export default async function runner() {
  // if there are no users it explodes so yeah
  if (await prisma.user.count() === 0) {
    return;
  }
  await initializeStreamInfo();
  await syncStream();
  setInterval(syncStream, 5000);
}

export async function initializeStreamInfo(channelId?: string) {
  const channels = await prisma.channel.findMany({
    where: {
      id: channelId
    },
    include: {
      streamInfo: true
    }
  });

  for (const channel of channels) {
    if (!channel.streamInfo.length) {
      await prisma.streamInfo.create({
        data: {
          username: channel.name,
          title: 'Untitled',
          category: 'Uncategorized',
          startedAt: new Date(0),
          thumbnail: 'https://placehold.co/150',
          viewers: 0,
          isLive: false,
          channel: {
            connect: { id: channel.id }
          },
          ownedBy: {
            connect: { id: channel.ownerId }
          }
        }
      });
    }
  }
}

export async function syncStream() {
  try {
    // get all active rooms
    const rooms = await roomService.listRooms();
    
    // process each room
    for (const room of rooms) {
      const isLive = room.numPublishers >= 1;

      const originalStreamInfo = await prisma.streamInfo.findUnique({
        where: { username: room.name }
      });
      
      // upsert stream info
      await prisma.streamInfo.upsert({
        where: { 
          username: room.name
        },
        create: {
          username: room.name,
          title: 'Untitled',
          category: 'Uncategorized',
          startedAt: new Date(),
          thumbnail: 'https://placehold.co/150',
          viewers: 0,
          channel: {
            connect: { id: room.name }
          },
          isLive,
          ownedBy: {
            connect: { id: room.name } 
          }
        },
        update: {
          isLive,
          viewers: room.numParticipants - 1,
          startedAt: !isLive ? new Date(0) : 
          (originalStreamInfo?.isLive ? originalStreamInfo.startedAt : new Date())
        }
      });
    }
  } catch (error) {
    console.error('Error syncing room streams:', error);
    throw error;
  }
}
