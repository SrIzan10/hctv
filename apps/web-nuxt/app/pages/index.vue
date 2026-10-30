<script setup lang="ts">
import ConfusedDino from '~/components/ui/confuseddino/ConfusedDino.vue';
import LandingPage from '~/components/app/LandingPage/LandingPage.vue';
import StreamGrid from '~/components/app/StreamGrid/StreamGrid.vue';

// (ui)/(public)/page.tsx
const { data: me } = await useFetch('/api/me', meFetchOptions);
const user = computed(() => me.value?.user ?? null);

if (user.value && !user.value.hasOnboarded) {
  await navigateTo('/onboarding');
}

const { data: streams } = user.value
  ? await useFetch<StreamInfoResponse>('/api/stream/info', { key: 'home-streams' })
  : { data: ref<StreamInfoResponse | null>(null) };

const liveStreams = computed(() => (streams.value ?? []).filter((stream) => stream.isLive));
const offlineStreams = computed(() => (streams.value ?? []).filter((stream) => !stream.isLive));
</script>

<template>
  <LandingPage v-if="!user" />
  <div
    v-else-if="!liveStreams.length && !offlineStreams.length"
    class="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center"
  >
    <ConfusedDino class="h-28 w-28 opacity-80" />
    <div class="space-y-1.5">
      <h2 class="pb-0 text-2xl font-semibold tracking-tight">Nothing live right now</h2>
      <p class="text-sm text-muted-foreground">Nobody's streaming yet — why not be the first?</p>
    </div>
    <NuxtLink
      to="/settings/channel"
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Start streaming
    </NuxtLink>
  </div>
  <div v-else class="p-3 md:p-6">
    <StreamGrid :live-streams="liveStreams" :offline-streams="offlineStreams" />
  </div>
</template>
