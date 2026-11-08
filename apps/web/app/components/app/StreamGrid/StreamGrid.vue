<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import ConfusedDino from '~/components/ui/confuseddino/ConfusedDino.vue';
import StreamCardBody from './StreamCardBody.vue';
import type { Channel, StreamInfo } from '@hctv/db';

type StreamWithChannel = StreamInfo & { channel: Channel };

const props = defineProps<{
  liveStreams: StreamWithChannel[];
  offlineStreams: StreamWithChannel[];
}>();

const sortedLiveStreams = computed(() =>
  props.liveStreams
    .filter((stream) => !stream.channel.is247)
    .sort((a, b) => b.viewers - a.viewers)
);
const alwaysOnStreams = computed(() =>
  [...props.liveStreams, ...props.offlineStreams]
    .filter((stream) => stream.isLive && stream.channel.is247)
    .sort((a, b) => {
      if (a.viewers !== b.viewers) {
        return b.viewers - a.viewers;
      }

      return a.channel.name.localeCompare(b.channel.name);
    })
);
const sortedOfflineStreams = computed(() =>
  [...props.offlineStreams].sort((a, b) => a.channel.name.localeCompare(b.channel.name))
);
const hasVisibleLiveStreams = computed(
  () => sortedLiveStreams.value.length > 0 || alwaysOnStreams.value.length > 0
);
</script>

<template>
  <div class="min-w-0 space-y-12">
    <div
      v-if="!hasVisibleLiveStreams"
      class="flex flex-col items-center gap-5 pt-10 pb-4 text-center md:pt-16"
    >
      <ConfusedDino class="h-28 w-28 opacity-80" />
      <div class="space-y-1.5">
        <h1 class="text-2xl font-bold">Nobody's streaming right now</h1>
        <p class="text-muted-foreground">
          Go live and show people what you're building, or check back later.
        </p>
      </div>
      <NuxtLink to="/stream">
        <Button class="bg-live text-live-foreground hover:bg-live/90">Go live</Button>
      </NuxtLink>
    </div>

    <section v-if="sortedLiveStreams.length > 0">
      <h2 class="mb-4 text-lg font-bold">
        Live now
        <span class="ml-1 font-normal tabular-nums text-muted-foreground">
          {{ sortedLiveStreams.length }}
        </span>
      </h2>
      <div class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <NuxtLink
          v-for="stream in sortedLiveStreams"
          :key="stream.id"
          :to="`/${stream.username}`"
          class="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StreamCardBody :stream="stream" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="alwaysOnStreams.length > 0">
      <h2 class="mb-4 text-lg font-bold">
        Always on
        <span class="ml-1 font-normal tabular-nums text-muted-foreground">
          {{ alwaysOnStreams.length }}
        </span>
      </h2>
      <div class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <NuxtLink
          v-for="stream in alwaysOnStreams"
          :key="stream.id"
          :to="`/${stream.username}`"
          class="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StreamCardBody :stream="stream" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="sortedOfflineStreams.length > 0">
      <h2 class="mb-4 text-lg font-bold">
        Channels
        <span class="ml-1 font-normal tabular-nums text-muted-foreground">
          {{ sortedOfflineStreams.length }}
        </span>
      </h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        <NuxtLink
          v-for="stream in sortedOfflineStreams"
          :key="stream.id"
          :to="`/${stream.username}`"
          class="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar class="h-10 w-10 shrink-0">
            <AvatarImage
              :src="stream.channel.pfpUrl"
              :alt="stream.channel.name"
              loading="lazy"
              decoding="async"
            />
            <AvatarFallback class="text-xs font-semibold">
              {{ stream.channel.name.slice(0, 2).toUpperCase() }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold">{{ stream.channel.name }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ stream.title || 'Offline' }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
