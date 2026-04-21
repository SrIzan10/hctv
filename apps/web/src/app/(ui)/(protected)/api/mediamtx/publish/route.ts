import { prisma, getRedisConnection } from '@hctv/db';
import { recordMediamtxAuth } from '@/lib/metrics';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let action = 'invalid';
  let protocol = 'invalid';

  const finish = (body: string, status: number, outcome: string) => {
    recordMediamtxAuth(action, protocol, outcome, (performance.now() - startedAt) / 1000);
    return new Response(body, { status });
  };

  const redis = getRedisConnection();
  const body = await request.json();

  if (process.env.NODE_ENV !== 'production') {
    console.log('Mediamtx publish auth request:', JSON.stringify(body, null, 2));
  }
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return finish('invalid request', 400, 'invalid_request');
  }
  const { action: parsedAction, protocol: parsedProtocol, path, password } = parsed.data;
  action = parsedAction;
  protocol = parsedProtocol;

  if (parsedAction === 'publish' && (parsedProtocol === 'srt' || parsedProtocol === 'webrtc')) {
    const channelKey = await redis.get(`streamKey:${path}`);

    if (channelKey) {
      if (channelKey !== password) {
        return finish('invalid stream key', 403, 'invalid_stream_key');
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
        const isExpired =
          channel.restriction.expiresAt && new Date(channel.restriction.expiresAt) < new Date();
        if (!isExpired) {
          return finish('channel restricted', 403, 'channel_restricted');
        }
      }

      if (channel?.owner?.ban) {
        const isExpired =
          channel.owner.ban.expiresAt && new Date(channel.owner.ban.expiresAt) < new Date();
        if (!isExpired) {
          return finish('user banned', 403, 'user_banned');
        }
      }

      if (channel?.streamInfo[0].isLive) {
        return finish('stream already live', 403, 'stream_already_live');
      }

      return finish('youre in yay', 200, 'authorized_publish');
    }
  }
  if (parsedAction === 'read' && parsedProtocol === 'hls') {
    if (password === process.env.MEDIAMTX_PUBLISH_KEY) {
      return finish('authorized (hls read key for thumbs)', 200, 'authorized_thumbnail');
    }
    const sessionExists = await redis.exists(`sessions:${password}`);
    if (!sessionExists) {
      return finish('unauthorized', 401, 'unauthorized_session');
    }
    return finish('authorized', 200, 'authorized_read');
  }

  return finish('uhh', 401, 'unauthorized');
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
