import { webMetricsRegistry } from '@/lib/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await webMetricsRegistry.metrics(), {
    headers: {
      'Content-Type': webMetricsRegistry.contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
