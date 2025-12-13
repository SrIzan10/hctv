import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    console.log('Parsing error:', parsed.error);
    return new Response('Invalid request', { status: 400 });
  }
  console.log('Parsed data:', parsed.data);
  const { action, protocol, path, password } = parsed.data;

  // if (action !== 'publish') return new Response('Action not allowed', { status: 403 });
  if (action === 'publish' && protocol !== 'srt') {
    const key = await prisma.streamKey.findFirst({
      where: {
        key: password,
      },
      include: {
        channel: true,
      },
    });

    if (!key) {
      return new Response('Invalid stream key', { status: 403 });
    }
    console.log('Stream key valid for channel:', key.channel.name);
  }
  
  return new Response('Request processed', { status: 200 });

}

const schema = z.object({
  user: z.string(),
  password: z.string(),
  token: z.string(),
  ip: z.string(),
  action: z.enum(['publish', 'read', 'playback', 'api', 'metrics', 'pprof']),
  path: z.string(),
  protocol: z.enum(['rtsp', 'rtmp', 'hls', 'webrtc', 'srt']),
  id: z.string().nullable(),
  query: z.string(),
});
