<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import ConfusedDino from '~/components/ui/confuseddino/ConfusedDino.vue';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel';
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
      if (a.isLive !== b.isLive) {
        return Number(b.isLive) - Number(a.isLive);
      }

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
  () => sortedLiveStreams.value.length > 0 || alwaysOnStreams.value.some((stream) => stream.isLive)
);
</script>

<template>
  <div class="space-y-8 md:space-y-10 min-w-0">
    <div v-if="!hasVisibleLiveStreams" class="flex flex-col items-center gap-4 py-10 text-center">
      <ConfusedDino class="h-24 w-24 opacity-70" />
      <div class="space-y-1">
        <p class="font-semibold">Nobody's live right now</p>
        <p class="text-sm text-muted-foreground">Why not be the first?</p>
      </div>
      <NuxtLink
        to="/settings/channel"
        class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Start streaming
      </NuxtLink>
    </div>

    <section v-if="sortedLiveStreams.length > 0">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="pb-0 text-sm font-semibold tracking-tight md:text-base">Live now</h2>
        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {{ sortedLiveStreams.length }}
        </span>
        <div class="ml-2 h-px flex-1 bg-border" />
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <NuxtLink
          v-for="stream in sortedLiveStreams"
          :key="stream.id"
          :to="`/${stream.username}`"
          class="group block w-full max-w-sm"
        >
          <StreamCardBody :stream="stream" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="alwaysOnStreams.length > 0">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="pb-0 text-sm font-semibold tracking-tight md:text-base">24/7 channels</h2>
        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {{ alwaysOnStreams.length }}
        </span>
        <div class="ml-2 h-px flex-1 bg-border" />
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <NuxtLink
          v-for="stream in alwaysOnStreams"
          :key="stream.id"
          :to="`/${stream.username}`"
          class="group block w-full max-w-sm"
        >
          <StreamCardBody :stream="stream" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="sortedOfflineStreams.length > 0" class="w-full min-w-0">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="pb-0 text-sm font-semibold tracking-tight md:text-base">Offline channels</h2>
        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {{ sortedOfflineStreams.length }}
        </span>
        <div class="ml-2 h-px flex-1 bg-border" />
      </div>
      <div class="px-10">
        <Carousel
          class="w-full max-w-full"
          :opts="{ dragFree: true, containScroll: 'trimSnaps' }"
        >
          <CarouselContent class="-ml-2">
            <CarouselItem
              v-for="stream in sortedOfflineStreams"
              :key="stream.id"
              class="basis-auto pl-2 md:pl-3"
            >
              <NuxtLink :to="`/${stream.username}`" class="group inline-flex w-[70px]">
                <div
                  class="flex w-[70px] flex-col items-center gap-1 rounded-lg p-1.5 transition-colors duration-150 hover:bg-muted/50 sm:w-[78px] md:w-[86px] md:gap-1.5 md:p-2"
                >
                  <div class="relative">
                    <Avatar
                      class="h-9 w-9 ring-2 ring-border transition-colors duration-150 group-hover:ring-border/60 sm:h-10 sm:w-10 md:h-11 md:w-11"
                    >
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
                    <span
                      class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/40"
                    />
                  </div>
                  <p class="w-full truncate text-center text-[10px] font-medium">
                    {{ stream.channel.name }}
                  </p>
                </div>
              </NuxtLink>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious class="hidden md:flex" />
          <CarouselNext class="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  </div>
</template>
