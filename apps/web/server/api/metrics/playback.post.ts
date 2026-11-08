import { z } from 'zod';
import { MEDIAMTX_REGIONS } from '../../../shared/utils/mediamtx/regions';

const schema = z.object({
  event: z.enum([
    'error',
    'heartbeat',
    'level',
    'load',
    'manifest',
    'playing',
    'recovery',
    'resync',
    'stall',
  ]),
  region: z.enum(MEDIAMTX_REGIONS),
  bandwidthKbps: z.number().finite().nonnegative().max(1_000_000).optional(),
  bitrateKbps: z.number().finite().nonnegative().max(1_000_000).optional(),
  bufferedSeconds: z.number().finite().nonnegative().max(3600).optional(),
  droppedFrames: z.number().int().nonnegative().max(1_000_000).optional(),
  errorType: z.string().max(64).optional(),
  fatal: z.boolean().optional(),
  height: z.number().int().nonnegative().max(16_384).optional(),
  latencySeconds: z.number().finite().nonnegative().max(3600).optional(),
  levelCount: z.number().int().nonnegative().max(100).optional(),
  recoveryReason: z.enum(['fatal', 'manual']).optional(),
  startupSeconds: z.number().finite().nonnegative().max(3600).optional(),
});

export default defineEventHandler(async (event) => {
  const contentLength = Number(getRequestHeader(event, 'content-length') ?? 0);
  if (contentLength > 4096) {
    return new Response('Playback metric too large', { status: 413 });
  }

  const origin = getRequestHeader(event, 'origin');
  if (origin && origin !== getRequestURL(event).origin) {
    return new Response('Forbidden', { status: 403 });
  }

  const parsed = schema.safeParse(await readBody(event).catch(() => null));
  if (!parsed.success) {
    return new Response('Invalid playback metric', { status: 400 });
  }

  recordPlaybackMetric(parsed.data);
  return new Response(null, { status: 204 });
});
