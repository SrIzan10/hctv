import { NextRequest } from 'next/server';
import { z } from 'zod';
import { recordPlaybackMetric } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  event: z.enum([
    'error',
    'heartbeat',
    'level',
    'load',
    'manifest',
    'playing',
    'recovery',
    'stall',
  ]),
  region: z.enum(['hq', 'ethande']),
  bandwidthKbps: z.number().finite().nonnegative().max(1_000_000).optional(),
  bitrateKbps: z.number().finite().nonnegative().max(1_000_000).optional(),
  bufferedSeconds: z.number().finite().nonnegative().max(3600).optional(),
  droppedFrames: z.number().int().nonnegative().max(1_000_000).optional(),
  errorType: z.string().max(64).optional(),
  fatal: z.boolean().optional(),
  height: z.number().int().nonnegative().max(16_384).optional(),
  levelCount: z.number().int().nonnegative().max(100).optional(),
  recoveryReason: z.enum(['fatal', 'manual']).optional(),
  startupSeconds: z.number().finite().nonnegative().max(3600).optional(),
});

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 4096) {
    return new Response('Playback metric too large', { status: 413 });
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('Forbidden', { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response('Invalid playback metric', { status: 400 });
  }

  recordPlaybackMetric(parsed.data);
  return new Response(null, { status: 204 });
}
