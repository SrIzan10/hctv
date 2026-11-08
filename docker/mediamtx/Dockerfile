# hctvmtx: MediaMTX fork with the on-demand forward-dests API used for multistreaming, in the
# transcode variant, which converts AAC audio to Opus so WebRTC viewers of OBS streams get sound
FROM ghcr.io/srizan10/hctvmtx:latest-transcode AS mediamtx

FROM alpine:3.24

RUN apk add --no-cache ca-certificates

COPY --from=mediamtx /mediamtx /
COPY ./docker/mediamtx/mediamtx.yml /mediamtx.yml

ENTRYPOINT ["/mediamtx"]
