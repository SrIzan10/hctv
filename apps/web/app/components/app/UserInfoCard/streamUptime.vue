<script setup lang="ts">
import { Clock3 } from '@lucide/vue';

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));
const { stream, isLoading } = useStreamLive(username);
const now = ref(Date.now());

useIntervalFn(() => {
  now.value = Date.now();
}, 1000);

const startedAt = computed(() => {
  if (!stream.value?.isLive) {
    return null;
  }
  return new Date(stream.value.startedAt).getTime();
});

const label = computed(() => {
  if (!startedAt.value) {
    return '';
  }
  const elapsedSeconds = Math.max(0, Math.floor((now.value - startedAt.value) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
});
</script>

<template>
  <span
    v-if="!isLoading && startedAt"
    class="inline-flex items-center gap-1 tabular-nums text-muted-foreground"
  >
    <Clock3 class="h-3.5 w-3.5" />
    {{ label }}
  </span>
</template>
