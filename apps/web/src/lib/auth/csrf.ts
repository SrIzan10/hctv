import { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifySameOrigin(request: NextRequest): Response | null {
  if (SAFE_METHODS.has(request.method)) {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return new Response('Forbidden', { status: 403 });
  }

  return null;
}
