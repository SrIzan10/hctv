import { validateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { ingressClient, roomService } from '@/lib/services/livekit';
import { IngressInput } from 'livekit-server-sdk';

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { channel } = body;

    const channelInfo = await prisma.channel.findUnique({
      where: { name: channel },
      include: {
        owner: true,
        managers: true
      }
    });

    if (!channelInfo) {
      return new Response('Channel not found', { status: 404 });
    }

    const isBroadcaster = 
      channelInfo.ownerId === user.id || 
      channelInfo.managers.some(m => m.id === user.id);

    if (!isBroadcaster) {
      return new Response('Unauthorized', { status: 401 });
    }

    // clean up existing resources
    const ingresses = await ingressClient.listIngress();
    const channelIngresses = ingresses.filter(ingress => ingress.name === channel);
    
    for (const ingress of channelIngresses) {
      await ingressClient.deleteIngress(ingress.ingressId);
    }

    // reset and create room
    const existingRoom = await roomService.listRooms()
      .then(rooms => rooms.find(r => r.name === channel));

    if (existingRoom) {
      await roomService.deleteRoom(existingRoom.name);
    }
    
    await roomService.createRoom({ name: channel });

    // create new ingress
    const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
      name: channel,
      roomName: channel,
      participantIdentity: 'streamer',
    });

    return Response.json({ 
      key: ingress.streamKey,
      url: ingress.url 
    });

  } catch (error) {
    console.error('Broadcaster token error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}