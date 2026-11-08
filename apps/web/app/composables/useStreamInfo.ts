// replaces lib/providers/StreamInfoProvider.tsx (`useStreams`): GET /api/stream/info polled every 5s,
// shared by every caller through one useAsyncData key. Only one poller runs at a time.
let activePollers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

export function useStreamInfo() {
  const { data, status, error, refresh } = useAsyncData<StreamInfoResponse>(
    'stream-info',
    () => $fetch<StreamInfoResponse>('/api/stream/info'),
    { lazy: true }
  );

  if (import.meta.client) {
    onMounted(() => {
      activePollers++;
      if (!timer) {
        timer = setInterval(() => {
          if (!document.hidden) refresh().catch(() => {});
        }, 5000);
      }
    });
    onBeforeUnmount(() => {
      activePollers = Math.max(0, activePollers - 1);
      if (activePollers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    });
  }

  return {
    stream: data,
    isLoading: computed(() => status.value === 'pending' && !data.value),
    error,
    refresh,
  };
}
