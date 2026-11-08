<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { callAction } from '~/lib/actions';
import { cn } from '~/lib/utils';
import type {
  MultistreamDestinationState,
  MultistreamDestinationView,
  MultistreamResponse,
} from '~/components/settings/channel/types';

// on/off switches for multistream destinations; adding and editing stays in channel settings
const props = defineProps<{ channelName: string }>();

const { data, error, refresh } = useFetch<MultistreamResponse>('/api/stream/multistream', {
  key: `multistream-${props.channelName}`,
  query: { channel: props.channelName },
  server: false,
  lazy: true,
});

useIntervalFn(() => {
  if (data.value?.isLive) void refresh();
}, 5000);

const destinations = computed(() => data.value?.destinations ?? []);
const busyIds = ref(new Set<string>());

async function toggle(destination: MultistreamDestinationView, enabled: boolean) {
  busyIds.value = new Set(busyIds.value).add(destination.id);
  try {
    const res = await callAction('updateMultistreamDestination', { id: destination.id, enabled });
    if (!res.success) toast.error(res.error ?? 'Could not update the destination');
    await refresh();
  } finally {
    const next = new Set(busyIds.value);
    next.delete(destination.id);
    busyIds.value = next;
  }
}

const STATE: Record<MultistreamDestinationState, { label: string; dot: string }> = {
  forwarding: { label: 'Live', dot: 'bg-live' },
  connecting: { label: 'Connecting', dot: 'bg-muted-foreground animate-pulse' },
  error: { label: 'Failed', dot: 'bg-warning' },
  offline: { label: 'Ready', dot: 'bg-muted-foreground/40' },
};

function stateOf(destination: MultistreamDestinationView) {
  if (!destination.enabled) return { label: 'Off', dot: 'bg-muted-foreground/40' };
  return STATE[destination.status.state];
}
</script>

<template>
  <div v-if="!data && !error" class="grid gap-3 p-3" aria-label="Loading destinations">
    <div v-for="i in 2" :key="i" class="flex items-center gap-3">
      <Skeleton class="h-3.5 flex-1" />
      <Skeleton class="h-[1.15rem] w-8 rounded-full" />
    </div>
  </div>

  <p v-else-if="!data" class="p-3 text-[13px] text-muted-foreground">Couldn't load destinations.</p>

  <p v-else-if="destinations.length === 0" class="p-3 text-[13px] text-muted-foreground">
    Send your stream to YouTube, Twitch and others too.
    <NuxtLink
      :to="`/settings/channel/${channelName}?tab=stream`"
      class="font-medium text-link hover:underline"
      >Add a destination</NuxtLink
    >
  </p>

  <ul v-else class="divide-y">
    <li v-for="destination in destinations" :key="destination.id" class="px-3 py-2">
      <div class="flex items-center gap-3">
        <span :class="cn('size-2 shrink-0 rounded-full', stateOf(destination).dot)" />
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ destination.name }}</span>
        <span class="text-[13px] text-muted-foreground">{{ stateOf(destination).label }}</span>
        <Switch
          :model-value="destination.enabled"
          :disabled="busyIds.has(destination.id)"
          :aria-label="`Send stream to ${destination.name}`"
          @update:model-value="(value: boolean) => toggle(destination, value)"
        />
      </div>
      <p
        v-if="destination.enabled && destination.status.state === 'error'"
        class="mt-1 pl-5 text-[13px] leading-snug text-muted-foreground"
      >
        {{ destination.status.error }}
      </p>
    </li>
  </ul>
</template>
