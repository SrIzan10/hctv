type StreamKeyResponse = { key: string };

// port of lib/hooks/useChannelStreamKey.ts. `channelName` may be a ref/getter; returns refs.
export function useChannelStreamKey(
  channelName?: MaybeRefOrGetter<string | undefined>,
  initialKey?: MaybeRefOrGetter<string | null | undefined>
) {
  const name = computed(() => toValue(channelName));
  const key = ref<string | null>(toValue(initialKey) ?? null);
  const error = ref<Error | undefined>();
  const isLoading = ref(false);
  const isRefreshing = ref(false);
  const isRegenerating = ref(false);

  async function load(): Promise<StreamKeyResponse | undefined> {
    if (!name.value) return undefined;
    const hadKey = key.value !== null;
    if (hadKey) isRefreshing.value = true;
    else isLoading.value = true;
    try {
      const res = await $fetch<StreamKeyResponse>('/api/rtmp/streamKey', {
        query: { channel: name.value },
      });
      key.value = res.key;
      error.value = undefined;
      return res;
    } catch (err: any) {
      error.value = new Error(err?.data || err?.statusMessage || 'Failed to load stream key');
      return undefined;
    } finally {
      isLoading.value = false;
      isRefreshing.value = false;
    }
  }

  if (import.meta.client) {
    watch(name, () => load(), { immediate: true });
  }

  async function regenerateStreamKey(): Promise<string> {
    if (!name.value) {
      throw new Error('Select a channel before regenerating its stream key');
    }
    isRegenerating.value = true;
    try {
      const res = await $fetch<StreamKeyResponse>('/api/rtmp/streamKey', {
        method: 'POST',
        body: { channel: name.value },
      });
      key.value = res.key;
      return res.key;
    } catch (err: any) {
      throw new Error(err?.data || err?.statusMessage || 'Failed to load stream key');
    } finally {
      isRegenerating.value = false;
    }
  }

  return {
    streamKey: computed(() => key.value ?? toValue(initialKey) ?? ''),
    error,
    isLoading,
    isRefreshing,
    isRegenerating,
    refreshStreamKey: load,
    regenerateStreamKey,
  };
}
