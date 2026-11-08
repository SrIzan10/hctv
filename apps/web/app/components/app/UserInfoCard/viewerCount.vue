<script setup lang="ts">
import { Eye } from '@lucide/vue';

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));
const { stream, isLoading } = useStreamLive(username);
</script>

<template>
  <span
    v-if="!isLoading && stream?.isLive"
    class="inline-flex items-center gap-1 tabular-nums text-muted-foreground"
  >
    <Eye class="h-3.5 w-3.5" />
    {{ stream.viewers.toLocaleString() }} watching
  </span>
</template>
