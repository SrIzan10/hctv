# HLS edge worker

This Worker authenticates viewers before serving HLS and caches media at Cloudflare's edge.

- Viewer credentials are validated against HackClub.tv and cached for 30 seconds by a SHA-256
  digest. Raw credentials are never used as cache keys.
- Playlists and codec initialization segments are cached for one second; uniquely named media
  segments are cached for one day.
- Media cache entries are shared only after each viewer has passed authentication.
- `hq` and `ethande` URL prefixes select the existing MediaMTX origin.

The production worker is deployed as `hctv-hls-edge` in the `sr-izan.workers.dev` account. The
web app uses it automatically on `hackclub.tv`; other deployments can set
`NEXT_PUBLIC_HLS_EDGE_URL` explicitly.

Zone-level routes are intentionally not required. If the Cloudflare token later receives Zone
permissions, a custom hostname can replace the workers.dev URL without changing the Worker.
