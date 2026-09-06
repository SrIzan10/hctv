FROM bluenviron/mediamtx:v1.21.0 AS mediamtx

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

COPY --from=mediamtx /mediamtx /
COPY ./docker/mediamtx/mediamtx.yml /mediamtx.yml

ENTRYPOINT ["/mediamtx"]
