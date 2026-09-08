const AUTH_URL = 'https://hackclub.tv/api/mediamtx/publish';
const AUTH_TIMESTAMP_HEADER = 'X-HCTV-Authorized-At';
const AUTH_FRESH_SECONDS = 30;
const AUTH_ENTRY_SECONDS = 300;
const PLAYLIST_CACHE_SECONDS = 1;
const INIT_SEGMENT_CACHE_SECONDS = 15;
const SEGMENT_CACHE_SECONDS = 86400;
const ALLOWED_ORIGINS = new Set(['https://hackclub.tv', 'http://localhost:3000']);
const MEDIA_ORIGINS = {
  hq: 'https://hls.hackclub.tv',
  ethande: 'https://hls-asuka.hackclub.tv',
};

export default {
  async fetch(request, env, context) {
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

    // Blocking playlist reloads must always reach the origin: a cached response
    // would be stale, and `_HLS_skip` responses are delta playlists that must
    // never be cached under the shared playlist key. Range requests must not be
    // served from full-body cache entries.
    const isBlockingPlaylist =
      route.mediaPath.endsWith('.m3u8') && url.searchParams.has('_HLS_msn');
    const isCacheable = !isBlockingPlaylist && !request.headers.has('Range');

    const cacheKey = createMediaCacheKey(request, route);
    const cache = caches.default;
    // Start the media lookup alongside authentication rather than behind it. For a part already
    // held at this colo the two local cache reads are the entire request, so serialising them
    // doubles the time to first byte for every cache hit.
    const cachedMedia = isCacheable
      ? cache.match(cacheKey).catch(() => undefined)
      : Promise.resolve(undefined);

    const authorization = request.headers.get('Authorization');
    if (
      !authorization ||
      !(await isAuthorized(authorization, route.mediaPath, url.origin, context))
    ) {
      return corsResponse(request, new Response('Unauthorized', { status: 401 }));
    }

    const cached = await cachedMedia;
    if (cached) {
      return corsResponse(request, withCacheStatus(cached, 'HIT'));
    }

    const originUrl = new URL(route.mediaPath, MEDIA_ORIGINS[route.region]);
    originUrl.search = url.search;

    const originHeaders = new Headers(request.headers);
    originHeaders.delete('Cookie');
    originHeaders.delete('Origin');
    const cdnSecret = getCdnSecret(env, route.region);
    if (cdnSecret) {
      originHeaders.set('Authorization', `Bearer ${cdnSecret}`);
    }
    const originResponse = await fetch(originUrl, {
      method: request.method,
      headers: originHeaders,
      redirect: 'follow',
    });

    const response = makeCacheableResponse(originResponse, route.mediaPath, isBlockingPlaylist);
    if (isCacheable && request.method === 'GET' && response.ok) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return corsResponse(request, withCacheStatus(response, 'MISS'));
  },
};

async function isAuthorized(authorization, mediaPath, workerOrigin, context) {
  const credentialHash = await sha256(authorization);
  const authCacheKey = new Request(`${workerOrigin}/__auth/${credentialHash}`);
  const cached = await caches.default.match(authCacheKey);

  if (cached) {
    const authorizedAt = Number(cached.headers.get(AUTH_TIMESTAMP_HEADER)) || 0;
    if (Date.now() - authorizedAt <= AUTH_FRESH_SECONDS * 1000) {
      return true;
    }

    // The entry outlives its freshness window so that re-checking it never puts a round trip to
    // hctv in front of a blocking playlist reload. At 200ms parts a viewer makes ~5 media
    // requests a second, so a blocking re-check lands as a visible mid-stream latency spike every
    // AUTH_FRESH_SECONDS. Revalidate behind the response instead; a viewer whose session hctv now
    // rejects loses the entry and is turned away on their next request.
    context.waitUntil(revalidateAuthorization(authorization, mediaPath, authCacheKey));
    return true;
  }

  if (!(await verifyWithOrigin(authorization, mediaPath))) {
    return false;
  }

  await storeAuthorization(authCacheKey);
  return true;
}

async function revalidateAuthorization(authorization, mediaPath, authCacheKey) {
  // Refresh the timestamp before the round trip, so the requests arriving while it is in flight
  // read the entry as fresh instead of each queueing a revalidation of their own.
  await storeAuthorization(authCacheKey);

  if (!(await verifyWithOrigin(authorization, mediaPath))) {
    await caches.default.delete(authCacheKey);
  }
}

function storeAuthorization(authCacheKey) {
  return caches.default.put(
    authCacheKey,
    new Response('ok', {
      headers: {
        'Cache-Control': `max-age=${AUTH_ENTRY_SECONDS}`,
        [AUTH_TIMESTAMP_HEADER]: String(Date.now()),
      },
    })
  );
}

async function verifyWithOrigin(authorization, mediaPath) {
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

  return response.ok;
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

function makeCacheableResponse(originResponse, mediaPath, isBlockingPlaylist) {
  const headers = new Headers(originResponse.headers);
  headers.delete('Set-Cookie');
  headers.delete('Cf-Cache-Status');
  headers.set(
    'Cache-Control',
    isBlockingPlaylist
      ? 'no-store'
      : mediaPath.endsWith('.m3u8')
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

function getCdnSecret(env, region) {
  if (!env) {
    return undefined;
  }

  const regionSecret = env[`HLS_CDN_SECRET_${region.toUpperCase()}`];
  if (regionSecret) {
    return regionSecret;
  }

  return env.HLS_CDN_SECRET;
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
