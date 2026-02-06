import { prisma, getRedisConnection } from '@hctv/db';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  const redis = getRedisConnection();
  const body = await request.json();

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'Mediamtx publish auth request:',
      JSON.stringify(body, null, 2)
    );
  };
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new Response('invalid request', { status: 400 });
  }
  const { action, protocol, path, password } = parsed.data;
  if (action === 'publish' && protocol === 'srt') {
    const channelKey = await redis.get(`streamKey:${path}`);

    if (channelKey) {
      if (channelKey !== password) {
        return new Response('invalid stream key', { status: 403 });
      }

      const channel = await prisma.channel.findUnique({
        where: { name: path },
        include: {
          restriction: true,
          owner: {
            include: { ban: true },
          },
          streamInfo: true,
        },
      });

      if (channel?.restriction) {
        const isExpired = channel.restriction.expiresAt &&
          new Date(channel.restriction.expiresAt) < new Date();
        if (!isExpired) {
          return new Response('channel restricted', { status: 403 });
        }
      }

      if (channel?.owner?.ban) {
        const isExpired = channel.owner.ban.expiresAt &&
          new Date(channel.owner.ban.expiresAt) < new Date();
        if (!isExpired) {
          return new Response('user banned', { status: 403 });
        }
      }

      if (channel?.streamInfo[0].isLive) {
        return new Response('stream already live', { status: 403 });
      }

      return new Response('youre in yay', { status: 200 });
    }
  } else if (action === 'read' && protocol === 'hls') {
    if (password === process.env.MEDIAMTX_PUBLISH_KEY) {
      return new Response('authorized (hls read key for thumbs)', { status: 200 });
    }
    const sessionExists = await redis.exists(`sessions:${password}`);
    if (!sessionExists) {
      return new Response('unauthorized', { status: 401 });
    }
    return new Response('authorized', { status: 200 });
  }

  return new Response('uhh', { status: 401 });
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
