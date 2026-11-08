<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { Pencil, Plus, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import { callAction } from '~/lib/actions';
import {
  MAX_MULTISTREAM_DESTINATIONS,
  MULTISTREAM_PLATFORM_META,
  isMultistreamPlatform,
} from '#shared/utils/multistream';
import MultistreamDestinationDialog from './MultistreamDestinationDialog.vue';
import type {
  ChannelSettingsChannel,
  MultistreamDestinationState,
  MultistreamDestinationView,
  MultistreamResponse,
} from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const confirm = useConfirm();

const { data, error, refresh } = useFetch<MultistreamResponse>('/api/stream/multistream', {
  key: `multistream-${props.channel.name}`,
  query: { channel: props.channel.name },
  server: false,
  lazy: true,
});

// statuses come from the media server, so poll while live to show connects and failures
useIntervalFn(() => {
  if (data.value?.isLive) void refresh();
}, 5000);

const destinations = computed(() => data.value?.destinations ?? []);
const isAtLimit = computed(() => destinations.value.length >= MAX_MULTISTREAM_DESTINATIONS);

const isDialogOpen = ref(false);
const editing = ref<MultistreamDestinationView | null>(null);
const busyIds = ref(new Set<string>());

function openAdd() {
  editing.value = null;
  isDialogOpen.value = true;
}

function openEdit(destination: MultistreamDestinationView) {
  editing.value = destination;
  isDialogOpen.value = true;
}

async function withBusy(id: string, fn: () => Promise<void>) {
  busyIds.value = new Set(busyIds.value).add(id);
  try {
    await fn();
  } finally {
    const next = new Set(busyIds.value);
    next.delete(id);
    busyIds.value = next;
  }
}

async function toggle(destination: MultistreamDestinationView, enabled: boolean) {
  await withBusy(destination.id, async () => {
    const res = await callAction('updateMultistreamDestination', { id: destination.id, enabled });
    if (!res.success) {
      toast.error(res.error ?? 'Could not update the destination');
    }
    await refresh();
  });
}

async function remove(destination: MultistreamDestinationView) {
  const isConfirmed = await confirm({
    title: `Remove ${destination.name}?`,
    description: data.value?.isLive
      ? 'hctv stops sending your stream there right away, and the saved stream key is deleted.'
      : 'The saved stream key is deleted.',
    confirmText: 'Remove',
    cancelText: 'Cancel',
  });
  if (!isConfirmed) return;

  await withBusy(destination.id, async () => {
    const res = await callAction('removeMultistreamDestination', { id: destination.id });
    if (res.success) {
      toast.success('Destination removed');
    } else {
      toast.error(res.error ?? 'Could not remove the destination');
    }
    await refresh();
  });
}

function platformLabel(platform: string) {
  return isMultistreamPlatform(platform) ? MULTISTREAM_PLATFORM_META[platform].label : platform;
}

const STATE_META: Record<MultistreamDestinationState, { label: string; dotClass: string }> = {
  forwarding: { label: 'Live', dotClass: 'bg-live' },
  connecting: { label: 'Connecting', dotClass: 'bg-amber-500' },
  error: { label: 'Failed', dotClass: 'bg-warning' },
  offline: { label: 'Starts when you go live', dotClass: 'bg-muted-foreground/40' },
};

function statusFor(destination: MultistreamDestinationView) {
  if (!destination.enabled) return { label: 'Off', dotClass: 'bg-muted-foreground/40' };
  return STATE_META[destination.status.state];
}
</script>

<template>
  <SettingsSection
    title="Multistreaming"
    description="Send your stream to YouTube, Twitch and others at the same time. Turn a destination on or off any time, even mid-stream."
  >
    <div class="grid gap-3">
      <!-- data stays undefined until the first client fetch lands; pending is still false the
           moment before it starts, so checking it would flash the empty state -->
      <div
        v-if="!data && !error"
        class="flex items-center gap-4 rounded-xl border bg-card px-4 py-3"
        aria-label="Loading destinations"
      >
        <div class="grid flex-1 gap-2">
          <Skeleton class="h-4 w-28" />
          <Skeleton class="h-3.5 w-44" />
        </div>
        <Skeleton class="h-[1.15rem] w-8 rounded-full" />
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="size-8 rounded-full" />
      </div>

      <p v-else-if="!data" class="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
        Couldn't load your destinations. Refresh the page to try again.
      </p>

      <p
        v-else-if="destinations.length === 0"
        class="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
      >
        No destinations yet. Add one and hctv forwards your stream there whenever you're live.
      </p>

      <ul v-else class="divide-y rounded-xl border bg-card">
        <li
          v-for="destination in destinations"
          :key="destination.id"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">
              {{ destination.name }}
              <span
                v-if="destination.name !== platformLabel(destination.platform)"
                class="font-normal text-muted-foreground"
              >
                · {{ platformLabel(destination.platform) }}
              </span>
            </p>
            <p class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span :class="['size-2 shrink-0 rounded-full', statusFor(destination).dotClass]" />
              {{ statusFor(destination).label }}
              <span v-if="destination.maskedKey">
                · key <span class="font-mono">{{ destination.maskedKey }}</span>
              </span>
            </p>
            <p
              v-if="destination.enabled && destination.status.state === 'error'"
              class="mt-1 text-[13px] leading-relaxed break-words text-foreground"
            >
              {{ destination.status.error }}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <Switch
              :model-value="destination.enabled"
              :disabled="busyIds.has(destination.id)"
              :aria-label="`Send stream to ${destination.name}`"
              @update:model-value="(value: boolean) => toggle(destination, value)"
            />
            <Button
              variant="ghost"
              size="icon"
              :aria-label="`Edit ${destination.name}`"
              @click="openEdit(destination)"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :disabled="busyIds.has(destination.id)"
              :aria-label="`Remove ${destination.name}`"
              @click="remove(destination)"
            >
              <Trash2 />
            </Button>
          </div>
        </li>
      </ul>

      <div class="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" :disabled="isAtLimit" @click="openAdd">
          <Plus />
          Add destination
        </Button>
        <p v-if="isAtLimit" class="text-[13px] text-muted-foreground">
          Up to {{ MAX_MULTISTREAM_DESTINATIONS }} destinations per channel.
        </p>
      </div>

      <p class="text-[13px] text-muted-foreground">
        Your stream is forwarded as is, so every platform gets the same quality you send to hctv.
        YouTube needs an audio track, or it silently drops the stream.
      </p>
    </div>

    <MultistreamDestinationDialog
      v-model:open="isDialogOpen"
      :channel-id="channel.id"
      :destination="editing"
      @saved="refresh"
    />
  </SettingsSection>
</template>
