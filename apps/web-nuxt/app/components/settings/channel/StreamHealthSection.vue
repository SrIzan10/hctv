<script setup lang="ts">
import { computed } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { ChevronRight, CircleAlert, CircleCheck, Lightbulb, Loader2 } from '@lucide/vue';
import { Skeleton } from '~/components/ui/skeleton';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import type { StreamHealthReport } from '#shared/types/streamHealth';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const { data, error, refresh } = useFetch<StreamHealthReport>('/api/stream/health', {
  key: `stream-health-${props.channel.name}`,
  query: { channel: props.channel.name },
  server: false,
  lazy: true,
});

// stats are averaged over 5 s windows on the media server, so polling faster shows nothing new
useIntervalFn(() => void refresh(), 5000);

const checks = computed(() => data.value?.checks ?? []);
// problems first, worst first; passing and still-measuring checks go in the compact grid
const problems = computed(() =>
  checks.value
    .filter((c) => c.status === 'warn' || c.status === 'tip')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'warn' ? -1 : 1))
);
const others = computed(() =>
  checks.value.filter((c) => c.status === 'good' || c.status === 'pending')
);

const warnCount = computed(() => problems.value.filter((c) => c.status === 'warn').length);
const tipCount = computed(() => problems.value.length - warnCount.value);
const isMeasuring = computed(() => checks.value.some((c) => c.status === 'pending'));

// fix texts mark literal values (typed into OBS) with backticks
function fixParts(text: string) {
  return text.split('`').map((part, i) => ({ part, isCode: i % 2 === 1 }));
}

const headline = computed(() => {
  if (warnCount.value > 0) {
    return warnCount.value === 1 ? '1 thing to fix' : `${warnCount.value} things to fix`;
  }
  if (isMeasuring.value) return 'Checking your stream…';
  if (tipCount.value > 0) return 'Looking good';
  return 'Everything looks good';
});
</script>

<template>
  <SettingsSection
    title="Stream health"
    description="While you're live, this checks your encoder settings for anything that adds delay or breaks playback."
  >
    <div
      v-if="!data && !error"
      class="overflow-hidden rounded-xl border bg-card"
      aria-label="Loading stream health"
    >
      <div class="flex items-center gap-2 px-4 py-3.5">
        <Skeleton class="size-[18px] rounded-full" />
        <Skeleton class="h-4 w-36" />
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 border-t px-4 py-3 sm:grid-cols-3">
        <div v-for="i in 3" :key="i" class="grid gap-1.5">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="h-3.5 w-14" />
        </div>
      </div>
    </div>

    <p
      v-else-if="!data || data.error"
      class="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-muted-foreground"
    >
      <CircleAlert class="size-4 shrink-0 text-warning" />
      {{ data?.error ?? "Couldn't check your stream." }} Trying again in a few seconds.
    </p>

    <p
      v-else-if="!data.isLive"
      class="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
    >
      Go live and your OBS settings show up here, with how to fix anything that slows down or breaks
      your stream.
    </p>

    <div v-else class="overflow-hidden rounded-xl border bg-card" aria-live="polite">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        <p class="flex items-center gap-2 font-bold">
          <CircleAlert v-if="warnCount > 0" class="size-[18px] text-warning" />
          <Loader2 v-else-if="isMeasuring" class="size-[18px] animate-spin text-muted-foreground" />
          <CircleCheck v-else class="size-[18px] text-success" />
          {{ headline }}
        </p>
        <p v-if="data.protocol" class="text-[13px] text-muted-foreground">
          via {{ data.protocol }}
        </p>
      </div>

      <ul v-if="problems.length" class="border-t">
        <li
          v-for="item in problems"
          :key="item.id"
          class="flex gap-3 border-b px-4 py-4 last:border-b-0"
        >
          <CircleAlert v-if="item.status === 'warn'" class="mt-0.5 size-4 shrink-0 text-warning" />
          <Lightbulb v-else class="mt-0.5 size-4 shrink-0 text-link" />
          <div class="min-w-0 flex-1">
            <p class="text-[15px] font-bold leading-snug">{{ item.title ?? item.label }}</p>
            <p v-if="item.message" class="mt-1 text-sm leading-relaxed text-muted-foreground">
              {{ item.message }}
            </p>
            <div v-if="item.fix" class="mt-3 rounded-xl bg-muted px-3 py-2.5">
              <p
                v-if="item.fix.path?.length"
                class="mb-1 flex flex-wrap items-center gap-x-1 text-[13px] text-muted-foreground"
              >
                <span class="font-medium text-foreground">OBS</span>
                <template v-for="step in item.fix.path" :key="step">
                  <ChevronRight class="size-3" />
                  <span>{{ step }}</span>
                </template>
              </p>
              <p class="text-sm leading-relaxed">
                <template v-for="(chunk, i) in fixParts(item.fix.text)" :key="i">
                  <code
                    v-if="chunk.isCode"
                    class="rounded-md bg-background px-1.5 py-0.5 font-mono text-[13px]"
                    >{{ chunk.part }}</code
                  >
                  <template v-else>{{ chunk.part }}</template>
                </template>
              </p>
            </div>
          </div>
        </li>
      </ul>

      <dl
        v-if="others.length"
        class="grid grid-cols-2 gap-x-4 gap-y-3 border-t px-4 py-3 sm:grid-cols-3"
      >
        <div v-for="item in others" :key="item.id" class="flex min-w-0 gap-2">
          <Loader2
            v-if="item.status === 'pending'"
            class="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground"
          />
          <CircleCheck v-else class="mt-0.5 size-3.5 shrink-0 text-success" />
          <div class="min-w-0">
            <dt class="text-[13px] text-muted-foreground">{{ item.label }}</dt>
            <dd class="text-sm font-medium break-words tabular-nums">
              {{ item.value }}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  </SettingsSection>
</template>
