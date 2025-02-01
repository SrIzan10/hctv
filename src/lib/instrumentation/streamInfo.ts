import prisma from "@/lib/db";
import { roomService } from "@/lib/services/livekit";

export default async function runner() {
  await syncStream();
  setInterval(syncStream, 5000);
}

export async function syncStream() {
  try {
    // Get all active rooms
    const rooms = await roomService.listRooms();
    
    // Process each room
    for (const room of rooms) {
      const isLive = room.numPublishers >= 1;

      const originalStreamInfo = await prisma.streamInfo.findUnique({
        where: { username: room.name }
      });
      
      // Upsert stream info
      await prisma.streamInfo.upsert({
        where: { 
          username: room.name
        },
        /* create: {
          username: room.name,
          title: originalStreamInfo?.title || 'Untitled',
          category: originalStreamInfo?.category || 'Uncategorized',
          startedAt: originalStreamInfo?.isLive ? originalStreamInfo.startedAt : new Date(),
          thumbnail: originalStreamInfo?.thumbnail || 'https://placehold.co/150',
          viewers: room.numParticipants,
          isLive,
          ownedBy: {
            connect: { username: room.name } 
          }
        }, */
        create: {
          username: room.name,
          title: 'Untitled',
          category: 'Uncategorized',
          startedAt: new Date(),
          thumbnail: 'https://placehold.co/150',
          viewers: 0,
          isLive,
          ownedBy: { 
            connect: { username: room.name } 
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
