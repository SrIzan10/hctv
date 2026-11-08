import type { ComputedRef, Ref } from 'vue';

// Vue port of lib/hooks/useUserList.tsx (SWR -> useAsyncData + interval polling).
// See useUserList.md for the original API notes; refs are returned where the React hook returned values.

const CACHE_KEYS = {
  ALL_CHANNELS: 'stream-info:all',
} as const;

export interface StreamInfoError extends Error {
  status?: number;
  statusText?: string;
  info?: any;
}

export interface UseUserListOptions {
  /** Only fetch channels owned by the current user */
  owned?: boolean;
  /** Include personal channels */
  personal?: boolean;
  /** Only fetch live channels */
  live?: boolean;
  /** Search for a specific user's streaminfo */
  username?: string;
  /** Refresh interval in milliseconds (0/undefined disables polling) */
  refreshInterval?: number;
  /** Whether to revalidate on window focus (default: false) */
  revalidateOnFocus?: boolean;
  /** Whether to pause fetching (default: false) */
  isPaused?: boolean;
  /** Custom error retry count (default: 3) */
  errorRetryCount?: number;
  /** Custom error retry interval in milliseconds (default: 5000) */
  errorRetryInterval?: number;
  /** Whether to refresh when hidden (default: false) */
  refreshWhenHidden?: boolean;
  /** Cache time to live in milliseconds; accepted for API compatibility, unused */
  cacheTTL?: number;
}

export interface UseUserListReturn {
  channels: ComputedRef<StreamInfoResponse>;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<StreamInfoError | undefined>;
  isValidating: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
  prefetch: () => Promise<void>;
  totalChannels: ComputedRef<number>;
  liveChannels: ComputedRef<number>;
  cacheKey: ComputedRef<string>;
  lastUpdated: Ref<Date | null>;
  isBackgroundFetching: ComputedRef<boolean>;
}

function createQuery(options: UseUserListOptions): string {
  const params = new URLSearchParams();
  if (options.owned) params.set('owned', 'true');
  if (options.personal) params.set('personal', 'true');
  if (options.live) params.set('live', 'true');
  if (options.username) params.set('username', options.username);
  return params.toString();
}

function createCacheKey(options: UseUserListOptions): string {
  const params = [];
  if (options.owned) params.push('owned');
  if (options.personal) params.push('personal');
  if (options.live) params.push('live');
  if (options.username) params.push(`user-${options.username}`);
  return params.length > 0 ? `stream-info:${params.join('-')}` : CACHE_KEYS.ALL_CHANNELS;
}

async function enhancedFetcher(
  url: string,
  fetcher: typeof $fetch = $fetch
): Promise<StreamInfoResponse> {
  try {
    const data = await fetcher<StreamInfoResponse>(url);
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected array');
    }
    return data;
  } catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status;
    if (status) {
      const error = new Error(`HTTP ${status}: ${err?.statusMessage ?? ''}`) as StreamInfoError;
      error.status = status;
      error.statusText = err?.statusMessage;
      error.info = err?.data;
      throw error;
    }
    throw err instanceof Error
      ? err
      : new Error('Unknown error occurred while fetching stream info');
  }
}

export function useUserList(
  optionsInput: MaybeRefOrGetter<UseUserListOptions> = {}
): UseUserListReturn {
  const options = computed(() => toValue(optionsInput) ?? {});
  const requestFetch = useRequestFetch() as typeof $fetch;

  const query = computed(() => createQuery(options.value));
  const url = computed(() => `/api/stream/info${query.value ? `?${query.value}` : ''}`);
  const cacheKey = computed(() => createCacheKey(options.value));
  const isPaused = computed(() => options.value.isPaused ?? false);
  const lastUpdated = ref<Date | null>(null);

  const { data, status, error: asyncError, refresh: refreshData } = useAsyncData<StreamInfoResponse>(
    () => cacheKey.value,
    async () => {
      if (isPaused.value) return [];
      const result = await enhancedFetcher(url.value, requestFetch);
      lastUpdated.value = new Date();
      return result;
    },
    { lazy: true, watch: [url], default: () => [] as StreamInfoResponse }
  );

  const error = computed(() => (asyncError.value as StreamInfoError | null) ?? undefined);

  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function refresh() {
    if (isPaused.value) return;
    await refreshData();
    if (asyncError.value) {
      console.error(`[useUserList] Error fetching data for key ${cacheKey.value}:`, asyncError.value);
    } else {
      retryCount = 0;
    }
  }

  // retry like the SWR config did
  async function refreshWithRetry() {
    await refresh();
    const err = error.value;
    if (!err) return;
    const maxRetries = options.value.errorRetryCount ?? 3;
    // no retries on 4xx (client errors) or after max attempts
    if ((err.status && err.status >= 400 && err.status < 500) || retryCount >= maxRetries) return;
    const base = options.value.errorRetryInterval ?? 5000;
    const timeout = Math.min(base * Math.pow(2, retryCount), 30000) + Math.random() * 1000;
    retryCount++;
    retryTimer = setTimeout(refreshWithRetry, timeout);
  }

  async function clearCache() {
    clearNuxtData((key) => key.startsWith('stream-info'));
  }

  if (import.meta.client) {
    const interval = computed(() => {
      const ms = options.value.refreshInterval;
      return isPaused.value || !ms ? 0 : ms;
    });
    watch(
      interval,
      (ms, _old, onCleanup) => {
        if (!ms) return;
        const id = setInterval(() => {
          if (document.hidden && !options.value.refreshWhenHidden) return;
          if (!navigator.onLine) return;
          refreshWithRetry();
        }, ms);
        onCleanup(() => clearInterval(id));
      },
      { immediate: true }
    );
    useEventListener(window, 'focus', () => {
      if (options.value.revalidateOnFocus) refreshWithRetry();
    });
    useEventListener(window, 'online', () => refreshWithRetry());
    onBeforeUnmount(() => {
      if (retryTimer) clearTimeout(retryTimer);
    });
  }

  const channels = computed(() => data.value ?? []);
  const isLoading = computed(() => status.value === 'pending' && channels.value.length === 0);
  const isValidating = computed(() => status.value === 'pending');

  return {
    channels,
    isLoading,
    error,
    isValidating,
    refresh,
    clearCache,
    prefetch: refresh,
    cacheKey,
    isBackgroundFetching: computed(() => isValidating.value && !isLoading.value),
    totalChannels: computed(() => channels.value.length),
    liveChannels: computed(() => channels.value.filter((stream) => stream.isLive).length),
    lastUpdated,
  };
}

export function useAllChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ refreshInterval: refreshInterval ?? 60000, refreshWhenHidden: false, errorRetryCount: 2 });
}

export function useOwnedChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ owned: true, refreshInterval: refreshInterval ?? 30000, revalidateOnFocus: true });
}

export function useLiveChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({
    live: true,
    refreshInterval: refreshInterval ?? 10000,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    errorRetryCount: 5,
  });
}

export function usePersonalChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ personal: true, refreshInterval: refreshInterval ?? 45000, revalidateOnFocus: true });
}

export interface UseUserStreamInfoReturn extends Omit<UseUserListReturn, 'channels'> {
  /** The found stream info for the specific user (first match) */
  streamInfo: ComputedRef<StreamInfoResponse[0] | null>;
  channels: ComputedRef<StreamInfoResponse>;
}

/** Stream info for one user; paused while `username` is empty. */
export function useUserStreamInfo(
  username: MaybeRefOrGetter<string | undefined>,
  refresh = true,
  refreshInterval?: number
): UseUserStreamInfoReturn {
  const result = useUserList(() => ({
    username: toValue(username),
    refreshInterval: refresh ? (refreshInterval ?? 15000) : undefined,
    revalidateOnFocus: true,
    isPaused: !toValue(username),
    errorRetryCount: 3,
  }));

  return {
    ...result,
    streamInfo: computed(() => result.channels.value[0] || null),
  };
}

/** Lazy version that doesn't fetch on its own: call `lookupUser(username)` on demand. */
export function useUserStreamInfoLazy(refreshInterval?: number) {
  const result = useUserList({
    refreshInterval: refreshInterval ?? 15000,
    revalidateOnFocus: true,
    isPaused: true,
    errorRetryCount: 3,
  });

  const lookupUser = async (username: string) => {
    if (!username) return null;
    try {
      const response = await enhancedFetcher(
        `/api/stream/info?username=${encodeURIComponent(username)}`
      );
      return response[0] || null;
    } catch (err) {
      console.error('[useUserStreamInfoLazy] Error looking up user:', err);
      throw err;
    }
  };

  return { ...result, lookupUser };
}

export const channelCacheUtils = {
  /** Clear all channel caches */
  clearAll: async (): Promise<void> => {
    clearNuxtData((key) => key.startsWith('stream-info'));
  },

  /** Invalidate live channels cache (useful when stream status changes) */
  invalidateLive: async (): Promise<void> => {
    await refreshNuxtData('stream-info:live');
  },

  /** Invalidate specific cache by options */
  invalidateByOptions: async (options: UseUserListOptions): Promise<void> => {
    await refreshNuxtData(createCacheKey(options));
  },

  /** Warm up cache by prefetching common queries */
  warmUp: async (): Promise<void> => {
    const queries = ['/api/stream/info', '/api/stream/info?live=true', '/api/stream/info?owned=true'];
    const results = await Promise.allSettled(queries.map((url) => enhancedFetcher(url)));
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[channelCacheUtils] ${failed.length} cache warm-up requests failed`);
    }
  },

  getStats: (): { cacheKeys: string[] } => ({ cacheKeys: Object.values(CACHE_KEYS) }),
};
