# HLS edge worker

This Worker authenticates viewers before serving HLS and caches media at Cloudflare's edge.

- Viewer credentials are validated against hctv and cached by a SHA-256 digest. Raw
  credentials are never used as cache keys. An entry is trusted outright for 30 seconds
  and then revalidated in the background for up to five minutes, so re-checking a session
  never blocks a blocking playlist reload; a session hctv rejects is turned away on the
  request after its revalidation fails.
- Media cache entries are shared only after each viewer has passed authentication.
- `hq` and `ethande` URL prefixes select the existing MediaMTX origin.
- Low-Latency HLS is passed through end to end: blocking playlist reloads
  (`_HLS_msn`/`_HLS_part`/`_HLS_skip` queries) always reach the origin and are served
  with `no-store`, so `_HLS_skip` delta playlists are never cached under the shared
  playlist key. Range requests are never served from cache.
- Playlists are cached for one second; codec initialization segments for 15 seconds;
  uniquely named media segments and parts for one day.

## Origin authentication

Set the `HLS_CDN_SECRET` Worker secret (alphanumeric) to make origin requests use
MediaMTX's CDN mode (`Authorization: Bearer <secret>` matching the origins'
`hlsCDNSecret` / `MTX_HLSCDNSECRET`). In CDN mode the origin skips per-request
authentication entirely, since the Worker has already authenticated each viewer.

When `HLS_CDN_SECRET` is unset, the viewer's `Authorization` header is forwarded to the
origin and MediaMTX's per-session authentication is used instead (requires MediaMTX
v1.18.1+).

The production Worker is deployed as `hctv-hls-edge` with the Custom Domain
`hls-edge.hackclub.tv`. The web app uses that hostname automatically on `hackclub.tv`; other
deployments can set `NEXT_PUBLIC_HLS_EDGE_URL` explicitly.

The Custom Domain makes the Worker the origin, with DNS and its edge certificate managed by
Cloudflare. A zone-level route and a MediaMTX origin DNS record are not required.
