import type { Channel, StreamInfo } from '@hctv/db';

export type LiveStreamEntry = StreamInfo & {
  channel: Channel & {
    isRestricted?: boolean;
    restrictionExpiresAt?: string | null;
  };
};

// live info for one stream (viewers, isLive, region, startedAt, restriction). every caller with the
// same username shares one fetch; pass `poll` from exactly one component to keep it fresh.
export function useStreamLive(username: MaybeRefOrGetter<string>, poll = false, intervalMs = 5000) {
  const name = computed(() => toValue(username));
  const key = computed(() => `stream-live-${name.value}`);
  const { data, error, status, refresh } = useFetch<LiveStreamEntry[]>('/api/stream/info', {
    key,
    query: computed(() => ({ username: name.value })),
    lazy: true,
    server: false,
    default: () => [] as LiveStreamEntry[],
  });

  if (poll) {
    useIntervalFn(() => {
      void refresh();
    }, intervalMs);
  }

  const stream = computed(() => data.value?.find((entry) => entry.username === name.value) ?? null);

  return { stream, error, isLoading: computed(() => status.value === 'pending' && !stream.value), refresh };
}
