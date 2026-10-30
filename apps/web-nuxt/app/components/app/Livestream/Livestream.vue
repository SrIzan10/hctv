<script setup lang="ts">
import { format } from 'date-fns';
import { AlertTriangle, RefreshCw } from '@lucide/vue';
import StreamPlayer from '../StreamPlayer/StreamPlayer.vue';
import UserInfoCard from '../UserInfoCard/UserInfoCard.vue';
import ChatPanel from '../ChatPanel/ChatPanel.vue';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { StreamInfo, Channel } from '@hctv/db';
import { getHlsEdgeUrl } from '#shared/utils/mediamtx/client';

const props = defineProps<Props>();

const isMobile = useIsMobile();
const { stream: currentStream, refresh } = useStreamLive(() => props.username, true);
const hlsEdgeUrl = getHlsEdgeUrl();
const isRestricted = ref(props.initialRestrictionActive);
const restrictionExpiresAt = ref<string | null>(props.initialRestrictionExpiresAt);
const isRefreshing = ref(false);

watch(
  currentStream,
  (stream) => {
    if (stream?.channel?.isRestricted) {
      isRestricted.value = true;
      restrictionExpiresAt.value = stream.channel.restrictionExpiresAt || null;
    } else if (isRestricted.value && stream && !stream.channel?.isRestricted) {
      isRestricted.value = false;
      restrictionExpiresAt.value = null;
    }
  },
  { immediate: true }
);

async function handleRefresh() {
  isRefreshing.value = true;
  try {
    await refresh();
  } finally {
    isRefreshing.value = false;
  }
}

interface Props {
  username: string;
  streamInfo: StreamInfo & { channel: Channel };
  canViewRestrictedStream: boolean;
  initialRestrictionActive: boolean;
  initialRestrictionExpiresAt: string | null;
}
</script>

<template>
  <div
    v-if="isRestricted && !canViewRestrictedStream"
    class="flex flex-col items-center justify-center h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] p-4"
  >
    <h1 class="text-2xl font-bold text-destructive mb-2">Channel Restricted</h1>
    <p class="text-muted-foreground text-center max-w-md mb-4">
      This channel has been restricted by a moderator and is no longer available for viewing.
    </p>
    <p v-if="restrictionExpiresAt" class="text-sm text-muted-foreground mb-4">
      Restriction lifts: {{ format(new Date(restrictionExpiresAt), 'PPP p') }}
    </p>
    <Button variant="outline" :disabled="isRefreshing" @click="handleRefresh">
      <RefreshCw :class="['h-4 w-4 mr-2', isRefreshing && 'animate-spin']" />
      {{ isRefreshing ? 'Checking...' : 'Check again' }}
    </Button>
  </div>

  <div
    v-else-if="isMobile"
    class="flex h-[calc(100vh-56px)] w-full min-w-0 flex-col"
  >
    <link
      v-if="hlsEdgeUrl && (currentStream?.isLive ?? streamInfo.isLive)"
      rel="preconnect"
      :href="hlsEdgeUrl"
      crossorigin="use-credentials"
    />
    <div class="aspect-video max-h-[42vh] w-full shrink-0 bg-black">
      <StreamPlayer />
    </div>
    <div
      v-if="isRestricted && canViewRestrictedStream"
      class="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-foreground"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
      <div class="text-sm">
        <p class="font-medium">Restricted stream override</p>
        <p>
          This channel is restricted and unavailable to regular viewers. You are watching it
          because you are a platform admin.
        </p>
        <p v-if="restrictionExpiresAt" class="mt-1 text-muted-foreground">
          Restriction lifts: {{ format(new Date(restrictionExpiresAt), 'PPP p') }}
        </p>
      </div>
    </div>
    <Tabs default-value="chat" class="min-h-0 flex-1 gap-0">
      <TabsList class="w-full shrink-0 bg-mantle">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
      </TabsList>
      <TabsContent
        value="chat"
        force-mount
        class="min-h-0 overflow-hidden data-[state=inactive]:hidden"
      >
        <ChatPanel />
      </TabsContent>
      <TabsContent value="about" class="min-h-0 overflow-y-auto">
        <UserInfoCard :stream-info="streamInfo" />
      </TabsContent>
    </Tabs>
  </div>

  <div v-else class="flex h-[calc(100vh-64px)] w-full min-w-0">
    <link
      v-if="hlsEdgeUrl && (currentStream?.isLive ?? streamInfo.isLive)"
      rel="preconnect"
      :href="hlsEdgeUrl"
      crossorigin="use-credentials"
    />
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div
        v-if="isRestricted && canViewRestrictedStream"
        class="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-foreground"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <div class="text-sm">
          <p class="font-medium">Restricted stream override</p>
          <p>
            This channel is restricted and unavailable to regular viewers. You are watching it
            because you are a platform admin.
          </p>
          <p v-if="restrictionExpiresAt" class="mt-1 text-muted-foreground">
            Restriction lifts: {{ format(new Date(restrictionExpiresAt), 'PPP p') }}
          </p>
        </div>
      </div>
      <div class="aspect-video max-h-[calc(100vh-64px-7rem)] w-full shrink-0 bg-black">
        <StreamPlayer />
      </div>
      <UserInfoCard :stream-info="streamInfo" />
    </div>

    <div class="h-full shrink-0">
      <ChatPanel />
    </div>
  </div>
</template>
