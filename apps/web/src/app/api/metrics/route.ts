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
  const authheader = req.headers.get('authorization') ?? req.headers.get('Authorization');

  if (!authheader) {
    return false;
  }

  const parts = authheader.split(' ');
  if (parts.length !== 2) {
    return false;
  }

  const scheme = parts[0];
  const encoded = parts[1];

  if (scheme !== 'Basic' || !encoded) {
    return false;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString();
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  const user = decoded.substring(0, separatorIndex);
  const pass = decoded.substring(separatorIndex + 1);

  return user === process.env.METRICS_USER && pass === process.env.METRICS_PASSWORD;
}