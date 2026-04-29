FROM bluenviron/mediamtx:1 AS mediamtx

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

COPY --from=mediamtx /mediamtx /
COPY ./docker/mediamtx/mediamtx.yml /mediamtx.yml

ENTRYPOINT ["/mediamtx"]
