<script setup lang="ts">
import type { StreamInfo, Channel } from '@hctv/db';
import Livestream from '~/components/app/Livestream/Livestream.vue';

definePageMeta({ middleware: 'protected' });

type StreamPageData =
  | { status: 'notFound' }
  | { status: 'restricted' }
  | {
      status: 'ok';
      streamInfo: StreamInfo & { channel: Channel };
      canViewRestrictedStream: boolean;
      initialRestrictionActive: boolean;
      initialRestrictionExpiresAt: string | null;
    };

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));
const { data } = await useFetch<StreamPageData>(() => `/api/pages/stream/${username.value}`, {
  key: () => `stream-page-${username.value}`,
});
</script>

<template>
  <div v-if="!data || data.status === 'notFound'">Stream not found</div>
  <div
    v-else-if="data.status === 'restricted'"
    class="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4"
  >
    <h1 class="text-2xl font-bold text-destructive mb-2">Channel Restricted</h1>
    <p class="text-muted-foreground text-center max-w-md">
      This channel has been restricted by a moderator and is not currently available for viewing.
    </p>
  </div>
  <Livestream
    v-else
    :key="username"
    :username="username"
    :stream-info="data.streamInfo"
    :can-view-restricted-stream="data.canViewRestrictedStream"
    :initial-restriction-active="data.initialRestrictionActive"
    :initial-restriction-expires-at="data.initialRestrictionExpiresAt"
  />
</template>
