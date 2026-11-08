// reuse the loaded user until `refresh()` (logout/onboarding) instead of refetching on every call
export const meFetchOptions = {
  key: 'me',
  getCachedData: (key: string, nuxtApp: ReturnType<typeof useNuxtApp>) =>
    nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
};

// current session user, hydrated by GET /api/me (replaces SessionProvider/useSession).
// `user` is null when logged out. `refresh()` refetches it (e.g. after onboarding).
export function useUser() {
  const { data, refresh, status } = useFetch('/api/me', meFetchOptions);
  const user = computed(() => data.value?.user ?? null);
  return { user, refresh, status };
}
