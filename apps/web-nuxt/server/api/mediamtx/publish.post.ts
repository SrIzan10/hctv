import { prisma, getRedisConnection } from '@hctv/db';
import { MEDIAMTX_REGIONS, type MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import { z } from 'zod';

const CHANNEL_PUBLISH_INCLUDE = {
  restriction: true,
  owner: { include: { ban: true } },
  streamInfo: true,
} as const;

type PublishChannel = {
  restriction: { expiresAt: Date | null } | null;
  owner: { ban: { expiresAt: Date | null } | null } | null;
  streamInfo: { isLive: boolean }[];
} | null;

async function resolvePublishChannel(path: string, password: string) {
  const redis = getRedisConnection();
  const streamKey = await redis.get(`streamKey:${path}`);
  if (!streamKey || streamKey !== password) {
    return null;
  }

  return prisma.channel.findUnique({
    where: { name: path },
    include: CHANNEL_PUBLISH_INCLUDE,
  });
}

function isExpired(expiresAt: Date | null) {
  return !expiresAt || new Date(expiresAt) < new Date();
}

function findPublishDenial(channel: PublishChannel) {
  if (channel?.restriction && !isExpired(channel.restriction.expiresAt)) {
    return { message: 'channel restricted', status: 403, outcome: 'channel_restricted' } as const;
  }

  if (channel?.owner?.ban && !isExpired(channel.owner.ban.expiresAt)) {
    return { message: 'user banned', status: 403, outcome: 'user_banned' } as const;
  }

  if (channel?.streamInfo[0]?.isLive) {
    return { message: 'stream already live', status: 403, outcome: 'stream_already_live' } as const;
  }

  return null;
}


function resolveRegion(request: Request) {
  const region = new URL(request.url).searchParams.get('region');

  return region && MEDIAMTX_REGIONS.includes(region as MediaMTXRegion) ? region : 'unknown';
}

const emptyableString = z
  .string()
  .nullish()
  .transform((value) => value ?? '');

const schema = z.object({
  user: emptyableString,
  password: emptyableString,
  token: emptyableString,
  ip: emptyableString,
  action: z.enum(['publish', 'read', 'playback', 'api', 'metrics', 'pprof']),
  path: emptyableString,
  protocol: z
    .union([z.enum(['rtsp', 'rtmp', 'hls', 'webrtc', 'srt']), z.literal('')])
    .nullish()
    .transform((value) => value ?? ''),
  id: z.string().nullable().default(null),
  query: emptyableString,
});

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const startedAt = performance.now();
  let action = 'invalid';
  let protocol = 'invalid';

  // Every region posts to the same webhook, so each one identifies itself with a
  // `region` query parameter on its MTX_AUTHHTTPADDRESS. Regions deployed before
  // that parameter existed report as `unknown`.
  const region = resolveRegion(request);

  const finish = (body: string, status: number, outcome: string) => {
    recordMediamtxAuth(action, protocol, outcome, region, (performance.now() - startedAt) / 1000);
    return new Response(body, { status });
  };

  const body = await request.json();

  if (process.env.NODE_ENV !== 'production') {
    console.log('Mediamtx publish auth request:', JSON.stringify(body, null, 2));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Invalid MediaMTX auth request:', parsed.error.flatten());
    }

    return finish('invalid request', 400, 'invalid_request');
  }

  const { action: parsedAction, protocol: parsedProtocol, path, password, token } = parsed.data;
  action = parsedAction;
  protocol = parsedProtocol || 'none';

  if (parsedAction === 'publish' && ['srt', 'webrtc', 'rtmp'].includes(parsedProtocol)) {
    const channel = await resolvePublishChannel(path, password);
    if (!channel) {
      return finish('invalid stream key', 403, 'invalid_stream_key');
    }

    const denial = findPublishDenial(channel);
    if (denial) {
      return finish(denial.message, denial.status, denial.outcome);
    }

    return finish('youre in yay', 200, 'authorized_publish');
  }

  if (parsedAction === 'read' && parsedProtocol === 'hls') {
    if (password === process.env.MEDIAMTX_PUBLISH_KEY) {
      return finish('authorized (hls read key for thumbs)', 200, 'authorized_thumbnail');
    }

    const redis = getRedisConnection();
    const sessionExists = await redis.exists(`sessions:${password}`);
    if (!sessionExists) {
      return finish('unauthorized', 401, 'unauthorized_session');
    }

    return finish('authorized', 200, 'authorized_read');
  }

  if (parsedAction === 'api') {
    if (password === process.env.MEDIAMTX_API_KEY || token === process.env.MEDIAMTX_API_KEY) {
      return finish('authorized api', 200, 'authorized_api');
    }

    return finish('unauthorized api', 401, 'unauthorized_api');
  }

  return finish('uhh', 401, 'unauthorized');
});
