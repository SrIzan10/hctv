const AUTH_URL = 'https://hackclub.tv/api/mediamtx/publish';
const AUTH_CACHE_SECONDS = 30;
const PLAYLIST_CACHE_SECONDS = 1;
const INIT_SEGMENT_CACHE_SECONDS = 1;
const SEGMENT_CACHE_SECONDS = 86400;
const ALLOWED_ORIGINS = new Set(['https://hackclub.tv', 'http://localhost:3000']);
const MEDIA_ORIGINS = {
  hq: 'https://hls.hackclub.tv',
  ethande: 'https://hls-asuka.hackclub.tv',
};

export default {
  async fetch(request, _env, context) {
    if (request.method === 'OPTIONS') {
      return corsResponse(request, new Response(null, { status: 204 }));
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return corsResponse(request, new Response('Method not allowed', { status: 405 }));
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return corsResponse(request, Response.json({ ok: true }));
    }

    const route = parseMediaRoute(url.pathname);
    if (!route) {
      return corsResponse(request, new Response('Not found', { status: 404 }));
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization || !(await isAuthorized(authorization, route.mediaPath, url.origin))) {
      return corsResponse(request, new Response('Unauthorized', { status: 401 }));
    }

    const cacheKey = createMediaCacheKey(request, route);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return corsResponse(request, withCacheStatus(cached, 'HIT'));
    }

    const originUrl = new URL(route.mediaPath, MEDIA_ORIGINS[route.region]);
    originUrl.search = url.search;

    const originHeaders = new Headers(request.headers);
    originHeaders.delete('Cookie');
    originHeaders.delete('Origin');
    const originResponse = await fetch(originUrl, {
      method: request.method,
      headers: originHeaders,
      redirect: 'follow',
    });

    const response = makeCacheableResponse(originResponse, route.mediaPath);
    if (request.method === 'GET' && response.ok && !request.headers.has('Range')) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return corsResponse(request, withCacheStatus(response, 'MISS'));
  },
};

async function isAuthorized(authorization, mediaPath, workerOrigin) {
  const credentialHash = await sha256(authorization);
  const authCacheKey = new Request(`${workerOrigin}/__auth/${credentialHash}`);
  const cached = await caches.default.match(authCacheKey);
  if (cached) {
    return true;
  }

  const credentials = parseBasicAuthorization(authorization);
  if (!credentials) {
    return false;
  }

  const channel = mediaPath.split('/').filter(Boolean)[0] || '';
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: credentials.user,
      password: credentials.password,
      token: '',
      ip: '',
      action: 'read',
      path: channel,
      protocol: 'hls',
      id: null,
      query: '',
    }),
  });

  if (!response.ok) {
    return false;
  }

  await caches.default.put(
    authCacheKey,
    new Response('ok', {
      headers: { 'Cache-Control': `max-age=${AUTH_CACHE_SECONDS}` },
    })
  );
  return true;
}

function parseBasicAuthorization(authorization) {
  if (!authorization.startsWith('Basic ')) {
    return null;
  }

  try {
    const decoded = atob(authorization.slice('Basic '.length));
    const separator = decoded.indexOf(':');
    if (separator === -1) {
      return null;
    }

    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function parseMediaRoute(pathname) {
  const [, region, ...rest] = pathname.split('/');
  if (!(region in MEDIA_ORIGINS) || rest.length < 2) {
    return null;
  }

  return { region, mediaPath: `/${rest.join('/')}` };
}

function createMediaCacheKey(request, route) {
  const url = new URL(request.url);
  url.pathname = `/${route.region}${route.mediaPath}`;
  url.search = '';
  return new Request(url, { method: 'GET' });
}

function makeCacheableResponse(originResponse, mediaPath) {
  const headers = new Headers(originResponse.headers);
  headers.delete('Set-Cookie');
  headers.delete('Cf-Cache-Status');
  headers.set(
    'Cache-Control',
    mediaPath.endsWith('.m3u8')
      ? `public, max-age=${PLAYLIST_CACHE_SECONDS}, stale-if-error=10`
      : mediaPath.endsWith('/init.mp4')
        ? `public, max-age=${INIT_SEGMENT_CACHE_SECONDS}`
        : `public, max-age=${SEGMENT_CACHE_SECONDS}, immutable`
  );

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers,
  });
}

function withCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set('X-HCTV-Cache', status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsResponse(request, response) {
  const origin = request.headers.get('Origin');
  const headers = new Headers(response.headers);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, X-HCTV-Cache');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
