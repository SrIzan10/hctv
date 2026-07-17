# Streaming delivery

hctv prioritizes reliable global playback over sub-second latency.

## Playback path

1. Broadcasters publish to the closest MediaMTX ingest region.
2. MediaMTX remuxes the source into standard fragmented-MP4 HLS with two-second segments.
3. The `hctv-hls-edge` Cloudflare Worker validates the viewer's session against the web app.
4. Valid sessions are cached by a credential digest for 30 seconds.
5. Playlists and codec initialization data are cached for one second; media segments are cached for
   one day at each Cloudflare edge.
6. hls.js starts four segments behind the live edge and can retain up to 30 seconds of forward
   buffer.

This keeps viewer authentication while allowing viewers in the same Cloudflare location to share
media cache entries. Raw session IDs are never written into cache keys or responses.

## Broadcaster profile

Until a server-side adaptive bitrate ladder is deployed, broadcasters should use:

- H.264 High profile at 1280x720 and 30 FPS
- 2,000 Kbps CBR video, with 2,500 Kbps as the practical ceiling
- A two-second keyframe interval
- AAC audio at 128 Kbps

MediaMTX remuxes rather than transcodes, so the bitrate sent by the broadcaster is the bitrate every
viewer must be able to receive.

## Playback metrics

Browsers submit low-cardinality QoE events to `/api/metrics/playback`. Prometheus exposes:

- `hctv_web_playback_events_total`
- `hctv_web_playback_errors_total`
- `hctv_web_playback_startup_duration_seconds`
- `hctv_web_playback_buffer_ahead_seconds`
- `hctv_web_playback_bandwidth_kbps`
- `hctv_web_playback_dropped_frames_total`

Useful alerts are a startup-time p95 above eight seconds, more than one stall per viewer-minute, or a
buffer-ahead p50 below four seconds.

## Cloudflare operations

The Worker source is in `cloudflare/hls-edge/worker.js`. The deployed service is `hctv-hls-edge`,
served through the Cloudflare-managed Custom Domain `hls-edge.hackclub.tv`.

The remaining zone-level infrastructure task is:

1. Repair the origin certificate behind `whip.hackclub.tv`; Cloudflare currently returns 526.

The workers.dev trigger can be disabled after the web deployment containing the Custom Domain URL
has rolled out successfully.

Do not add a Cache Everything rule directly to the MediaMTX hostnames. It would either bypass viewer
authorization or vary the cache per session. Authentication must remain in front of the shared media
cache, as it is in the Worker.

## Adaptive bitrate follow-up

The edge and player automatically support multivariant playlists, but MediaMTX does not create an
ABR ladder itself. The next infrastructure step is a transcoder/packager producing at least 720p,
480p, and 360p renditions. Enabling FFmpeg per stream without capacity limits is unsafe, so that work
requires CPU/GPU sizing, concurrency limits, and overload behavior before production rollout.
