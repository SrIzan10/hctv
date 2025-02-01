import { validateRequest } from '@/lib/auth';
import { ingressClient, roomService } from '@/lib/services/livekit';
import { IngressInput } from 'livekit-server-sdk';

export async function GET() {
  const { user } = await validateRequest();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // delete all ingresses, deprecation should be fine :clueless:
  const ingresses = await ingressClient.listIngress();
  const userIngresses = ingresses.filter(ingress => ingress.name === user.username);
  
  for (const ingress of userIngresses) {
    await ingressClient.deleteIngress(ingress.ingressId);
  }

  // dleete and recreate room
  const room = (await roomService.listRooms()).filter((r) => r.name === user.username)[0];
  if (room) {
    await roomService.deleteRoom(room.name);
  }
  
  await roomService.createRoom({
    name: user.username,
  });

  // create new ingress
  const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
    name: user.username,
    roomName: user.username,
    participantIdentity: 'streamer',
  });

  return Response.json({ key: ingress.streamKey });
}