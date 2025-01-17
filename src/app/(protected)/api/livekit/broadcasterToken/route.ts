import { ingressClient, roomService } from '@/lib/services/livekit';
import { IngressInput } from 'livekit-server-sdk';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room');

  if (!room) {
    return new Response('Missing room', { status: 400 });
  }

  await roomService.createRoom({
    name: room,
  })
  const ingress = await ingressClient.createIngress(
    IngressInput.RTMP_INPUT,
    {
      name: room,
      roomName: room,
      participantIdentity: 'streamer',
    }
  )

  return Response.json({ key: ingress.streamKey });
}