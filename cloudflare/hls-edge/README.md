# HLS edge worker

This Worker authenticates viewers before serving HLS and caches media at Cloudflare's edge.

- Viewer credentials are validated against hctv and cached for 30 seconds by a SHA-256
  digest. Raw credentials are never used as cache keys.
- Playlists and codec initialization segments are cached for one second; uniquely named media
  segments are cached for one day.
- Media cache entries are shared only after each viewer has passed authentication.
- `hq` and `ethande` URL prefixes select the existing MediaMTX origin.

The production Worker is deployed as `hctv-hls-edge` with the Custom Domain
`hls-edge.hackclub.tv`. The web app uses that hostname automatically on `hackclub.tv`; other
deployments can set `NEXT_PUBLIC_HLS_EDGE_URL` explicitly.

The Custom Domain makes the Worker the origin, with DNS and its edge certificate managed by
Cloudflare. A zone-level route and a MediaMTX origin DNS record are not required.
