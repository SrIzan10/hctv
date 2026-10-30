<script setup lang="ts">
import {
  AlertTriangle,
  CircleAlert,
  Globe,
  LoaderCircle,
  Monitor,
  Radio,
  RefreshCw,
  Square,
  Video,
  Loader2,
} from '@lucide/vue';
import type { Component } from 'vue';
import ChannelSelect from '~/components/app/ChannelSelect/ChannelSelect.vue';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { getMediamtxClientRegionOptions } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';

definePageMeta({ middleware: 'protected' });

const serverOptions = getMediamtxClientRegionOptions();
const whipEnabledServerOptions = serverOptions.filter((server) => server.whipEnabled);
const defaultRegion = whipEnabledServerOptions[0]?.value ?? 'hq';
const selectedChannel = ref('');
const selectedRegion = ref<MediaMTXRegion>(defaultRegion);
const { channels, isLoading: isLoadingChannels } = useOwnedChannels();
const ownedChannels = computed(() => channels.value.map(({ channel }) => channel));
const {
  streamKey,
  error: streamKeyError,
  isLoading: isLoadingStreamKey,
} = useChannelStreamKey(() => selectedChannel.value || undefined);
const {
  browserWarning,
  changeSource,
  hasPreview,
  issue,
  isLive,
  isPreviewReady,
  isPreviewingSource,
  isSessionActive,
  isStarting,
  isSwitchingSource,
  previewRef,
  previewSource,
  startPublishing,
  stopPublishing,
} = useScreensharePublisher({
  channelName: selectedChannel,
  region: selectedRegion,
  streamKey,
});

const hasChannels = computed(() => ownedChannels.value.length > 0);
const selectedServer = computed(() =>
  whipEnabledServerOptions.find((server) => server.value === selectedRegion.value)
);
const hasWhipEnabledServerOptions = whipEnabledServerOptions.length > 0;
const canStartPublishing = computed(
  () =>
    !isSessionActive.value &&
    !isPreviewingSource.value &&
    Boolean(selectedChannel.value) &&
    Boolean(streamKey.value) &&
    Boolean(selectedServer.value?.whipEnabled) &&
    !isLoadingStreamKey.value
);
const channelPlaceholder = computed(() =>
  isLoadingChannels.value ? 'Loading channels...' : 'Select a channel'
);
const primaryIssue = computed(() => issue.value ?? browserWarning.value);

watch(
  [isSessionActive, ownedChannels, selectedChannel],
  () => {
    if (isSessionActive.value) {
      return;
    }

    if (!ownedChannels.value.some((channel) => channel.name === selectedChannel.value)) {
      selectedChannel.value = ownedChannels.value[0]?.name ?? '';
    }
  },
  { immediate: true }
);

function handleBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

watch(isLive, (live, _prev, onCleanup) => {
  if (!live || !import.meta.client) {
    return;
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
  onCleanup(() => window.removeEventListener('beforeunload', handleBeforeUnload));
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
});

const statusLabel = computed(() =>
  isLive.value
    ? 'LIVE'
    : isSwitchingSource.value
      ? 'Switching'
      : isStarting.value
        ? 'Connecting'
        : isPreviewingSource.value
          ? hasPreview.value
            ? 'Updating Preview'
            : 'Preparing Preview'
          : isPreviewReady.value
            ? 'Preview'
            : 'Ready'
);

function getStreamKeyErrorDescription(message: string) {
  if (message.toLowerCase().includes('unauthorized')) {
    return 'You no longer have permission to stream to this channel. Try another channel or sign in again.';
  }

  if (message.toLowerCase().includes('not found')) {
    return 'This channel does not have a valid stream key yet. Regenerate it in channel settings, then retry.';
  }

  return 'Refresh the page and try again. If it keeps failing, check channel settings and server config.';
}

function reloadPage() {
  window.location.reload();
}

const primaryIconComponent = computed<Component>(() =>
  primaryIssue.value?.tone === 'warning' ? AlertTriangle : CircleAlert
);
</script>

<template>
  <div class="relative flex min-h-[calc(100vh-4rem)] flex-col">
    <!-- Video Stage -->
    <div class="flex flex-1 items-center justify-center px-4 py-4 md:px-6">
      <div class="w-full max-w-6xl">
        <div class="relative overflow-hidden rounded-3xl border border-border/60 bg-black shadow-2xl">
          <div class="relative aspect-video w-full bg-black">
            <video
              ref="previewRef"
              autoplay
              muted
              playsinline
              class="h-full w-full object-contain"
            />

            <div
              v-if="!hasPreview"
              class="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-muted-foreground"
            >
              <div
                class="flex h-24 w-24 items-center justify-center rounded-full border border-secondary bg-secondary/80"
              >
                <Monitor class="h-10 w-10 text-primary/80" />
              </div>
              <div class="max-w-md text-center space-y-1.5">
                <p class="text-lg font-medium text-zinc-200">Ready to livestream</p>
                <p class="text-sm text-zinc-400">Select a tab, window, or display to preview.</p>
              </div>
            </div>

            <div
              v-if="isPreviewingSource || isStarting || isSwitchingSource"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white backdrop-blur-sm"
            >
              <LoaderCircle class="h-8 w-8 animate-spin" />
              <p class="text-sm font-medium">
                {{
                  isPreviewingSource
                    ? hasPreview
                      ? 'Updating preview...'
                      : 'Preparing preview...'
                    : isStarting
                      ? 'Starting broadcast...'
                      : 'Switching source...'
                }}
              </p>
            </div>

            <div class="absolute left-6 top-6">
              <Badge
                :variant="isLive ? 'default' : hasPreview ? 'secondary' : 'outline'"
                :class="
                  cn(
                    'gap-2 px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md transition-all',
                    isLive && 'bg-live text-live-foreground hover:bg-live/90',
                    !isLive && !hasPreview && 'border-zinc-800 bg-black/50 text-zinc-400'
                  )
                "
              >
                <span
                  v-if="isLive"
                  class="h-2 w-2 animate-pulse rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                />
                {{ statusLabel }}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="streamKeyError || primaryIssue"
      class="absolute inset-x-0 top-4 z-10 mx-auto max-w-xl px-4 md:top-6"
    >
      <Card
        v-if="streamKeyError"
        class="overflow-hidden border-l-4 border-l-destructive bg-destructive/[0.03] shadow-xl backdrop-blur-md"
      >
        <CardContent class="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
          <div class="flex items-start gap-3">
            <CircleAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div class="space-y-1">
              <p class="text-sm font-semibold">Could not load the stream key</p>
              <p class="text-sm text-muted-foreground">
                {{ getStreamKeyErrorDescription(streamKeyError.message) }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 md:shrink-0">
            <Button size="sm" variant="outline" @click="reloadPage">
              <RefreshCw class="mr-2 h-4 w-4" />
              Reload page
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        v-if="primaryIssue"
        :class="
          cn(
            'overflow-hidden border-l-4 shadow-xl backdrop-blur-md',
            primaryIssue.tone === 'warning'
              ? 'border-l-amber-500 bg-amber-500/[0.03]'
              : 'border-l-destructive bg-destructive/[0.03]'
          )
        "
      >
        <CardContent class="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
          <div class="flex items-start gap-3">
            <component
              :is="primaryIconComponent"
              :class="
                cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  primaryIssue.tone === 'warning' ? 'text-amber-500' : 'text-destructive'
                )
              "
            />
            <div class="space-y-1">
              <p class="text-sm font-semibold">{{ primaryIssue.title }}</p>
              <p class="text-sm text-muted-foreground">{{ primaryIssue.description }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 md:shrink-0">
            <div class="flex flex-wrap gap-2">
              <Button
                v-if="!isSessionActive && primaryIssue.context === 'preview'"
                size="sm"
                :disabled="isPreviewingSource"
                @click="previewSource"
              >
                <Loader2 v-if="isPreviewingSource" class="animate-spin" />
                Preview again
              </Button>

              <Button
                v-if="
                  !isSessionActive &&
                  primaryIssue.context !== 'warning' &&
                  primaryIssue.context !== 'preview'
                "
                size="sm"
                :disabled="!canStartPublishing"
                @click="startPublishing"
              >
                Try again
              </Button>

              <Button
                v-if="primaryIssue.context === 'switch' && isLive"
                size="sm"
                :disabled="isSwitchingSource"
                @click="changeSource"
              >
                <Loader2 v-if="isSwitchingSource" class="animate-spin" />
                Try switching again
              </Button>

              <Button
                v-if="isSessionActive && primaryIssue.context !== 'warning'"
                size="sm"
                variant="outline"
                @click="stopPublishing"
              >
                Stop stream
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      class="shrink-0 border-t border-border/50 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div
        class="mx-auto flex max-w-6xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-5">
          <div class="flex items-center gap-3">
            <Video class="h-4 w-4 text-muted-foreground" />
            <ChannelSelect
              :channel-list="ownedChannels"
              :disabled="isSessionActive || isLoadingChannels || !hasChannels"
              :placeholder="channelPlaceholder"
              :value="selectedChannel || undefined"
              trigger-class-name="w-48"
              @select="(value: string) => (selectedChannel = value)"
            />
          </div>

          <div class="flex items-center gap-3">
            <Globe class="h-4 w-4 text-muted-foreground" />
            <Select
              :model-value="selectedRegion"
              :disabled="isSessionActive || !hasWhipEnabledServerOptions"
              @update:model-value="(value) => (selectedRegion = value as MediaMTXRegion)"
            >
              <SelectTrigger class="w-44">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="server in whipEnabledServerOptions"
                  :key="server.value"
                  :value="server.value"
                >
                  {{ server.label }} {{ server.emoji }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p v-if="!hasChannels && !isLoadingChannels" class="text-xs text-muted-foreground">
            Create a channel to stream.
          </p>
        </div>

        <!-- Right: Actions -->
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div v-if="!isSessionActive" class="flex flex-wrap items-center gap-2">
            <Button variant="secondary" :disabled="isPreviewingSource" @click="previewSource">
              <Loader2 v-if="isPreviewingSource" class="animate-spin" />
              <Monitor v-else class="mr-2 h-4 w-4" />
              {{ hasPreview ? 'Change Preview' : 'Preview' }}
            </Button>

            <Button
              v-if="hasPreview"
              variant="outline"
              :disabled="isPreviewingSource"
              @click="stopPublishing"
            >
              <Square class="mr-2 h-4 w-4" />
              Clear Preview
            </Button>

            <Button :disabled="!canStartPublishing || isSwitchingSource || isStarting" @click="startPublishing">
              <Loader2 v-if="isStarting" class="animate-spin" />
              <Radio v-else class="mr-2 h-4 w-4" />
              Start
            </Button>
          </div>
          <div v-else class="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              :disabled="!isLive || isSwitchingSource"
              @click="changeSource"
            >
              <Loader2 v-if="isSwitchingSource" class="animate-spin" />
              <RefreshCw v-else class="mr-2 h-4 w-4" />
              Switch
            </Button>

            <Button
              variant="outline"
              :disabled="isPreviewingSource || isSwitchingSource"
              @click="stopPublishing"
            >
              <Square class="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
