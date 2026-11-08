<script setup lang="ts">
import { Button } from '~/components/ui/button';
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
      <h1 class="text-2xl font-bold">Nobody's streaming right now</h1>
      <p class="text-muted-foreground">Go live and show people what you're building.</p>
    </div>
    <NuxtLink to="/stream">
      <Button class="bg-live text-live-foreground hover:bg-live/90">Go live</Button>
    </NuxtLink>
  </div>
  <div v-else class="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
    <StreamGrid :live-streams="liveStreams" :offline-streams="offlineStreams" />
  </div>
</template>
