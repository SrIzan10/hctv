const DEFAULT_TAB = 'general';

// replaces lib/nuqs/channelSettings.ts: `?tab=` route-query state (default 'general'; the default is
// dropped from the URL like nuqs does, and updates replace the history entry)
export function useChannelSettingsQuery() {
  const route = useRoute();
  const router = useRouter();

  const tab = computed<string>({
    get: () => {
      const value = route.query.tab;
      return (Array.isArray(value) ? value[0] : value) || DEFAULT_TAB;
    },
    set: (value) => {
      const query = { ...route.query };
      if (value === DEFAULT_TAB) delete query.tab;
      else query.tab = value;
      router.replace({ query });
    },
  });

  return { tab };
}
