import { getMediamtxClientEnvs } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';

// long on purpose, so the URL doesn't look like it only holds a username when shared by accident
const INGEST_USER = 'thisusernameislongonpurposesoyoudontaccidentallyleakyourstreamkey';

// what streamers paste into OBS: an SRT URL with the key inside, or an RTMP server + stream key
export function useIngestUrls(
  channelName: MaybeRefOrGetter<string>,
  streamKey: MaybeRefOrGetter<string | null | undefined>,
  region: MaybeRefOrGetter<MediaMTXRegion>
) {
  const srtUrl = computed(() => {
    const key = toValue(streamKey);
    if (!key) return '';
    const { ingestRoute } = getMediamtxClientEnvs(toValue(region));
    return `srt://${ingestRoute}?streamid=publish:${toValue(channelName)}:${INGEST_USER}:${key}&pkt_size=1316`;
  });

  const rtmpServerUrl = computed(
    () => `rtmp://${getMediamtxClientEnvs(toValue(region)).rtmpRoute}`
  );

  const rtmpStreamKey = computed(() => {
    const key = toValue(streamKey);
    if (!key) return '';
    return `${toValue(channelName)}?user=${INGEST_USER}&pass=${key}`;
  });

  return { srtUrl, rtmpServerUrl, rtmpStreamKey };
}
