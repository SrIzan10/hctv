import { webMetricsRegistry } from '@/lib/metrics';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !isAuthenticated(req)) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic' },
    });
  }
  return new Response(await webMetricsRegistry.metrics(), {
    headers: {
      'Content-Type': webMetricsRegistry.contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

// source: https://vancelucas.com/blog/how-to-add-http-basic-auth-to-next-js/
function isAuthenticated(req: NextRequest) {
  const authheader = req.headers.get('authorization') || req.headers.get('Authorization');

  if (!authheader) {
    return false;
  }

  const auth = Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user == process.env.METRICS_USER && pass == process.env.METRICS_PASS) {
    return true;
  } else {
    return false;
  }
}