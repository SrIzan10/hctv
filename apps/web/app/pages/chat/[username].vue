<script setup lang="ts">
import ChatPanel from '~/components/app/ChatPanel/ChatPanel.vue';

definePageMeta({ layout: 'bare' });

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));
// the OBS chat panel has no restriction gate in the original: only a missing channel matters
const { data } = await useFetch<{ status: string }>(() => `/api/pages/stream/${username.value}`, {
  key: () => `chat-page-${username.value}`,
});
</script>

<template>
  <div v-if="data?.status === 'notFound'">Stream not found</div>
  <div v-else class="bg-transparent h-screen">
    <ChatPanel is-obs-panel />
  </div>
</template>
