import { prisma, getRedisConnection } from '@hctv/db';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new Response('invalid request', { status: 400 });
  }
  const { action, protocol, path, password } = parsed.data;
  if (action === 'publish' && protocol === 'srt') {
    const redis = getRedisConnection();
    const channelKey = await redis.get(`streamKey:${path}`)

    if (channelKey) {
      if (channelKey !== password) {
        return new Response('invalid stream key', { status: 403 });
      }
      return new Response('youre in yay', { status: 200 });
    } else {
      const key = await prisma.streamKey.findFirst({
        where: {
          key: password,
          channel: {
            name: path,
          }
        },
        include: {
          channel: true,
        },
      });

      if (!key) {
        return new Response('invalid stream key', { status: 403 });
      }
    }
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
