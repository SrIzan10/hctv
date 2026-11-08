// port of apps/web (ui)/(protected)/layout.tsx: logged out -> hackclub login, not onboarded ->
// /onboarding, banned -> the default layout renders <AccountSuspended> (state `account-ban`)
export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch();
  const { data } = await useFetch('/api/me', meFetchOptions);
  const user = data.value?.user;

  if (!user) {
    return navigateTo('/auth/hackclub', { external: true });
  }
  if (!user.hasOnboarded) {
    return navigateTo('/onboarding');
  }

  const ban = useState<{ reason: string; expiresAt: string | null } | null>('account-ban', () => null);
  ban.value = await requestFetch('/api/ban').catch(() => null);
});
