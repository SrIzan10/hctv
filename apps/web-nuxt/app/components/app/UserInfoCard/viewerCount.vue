<script setup lang="ts">
import { User } from '@lucide/vue';

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));
const { stream, isLoading } = useStreamLive(username);
</script>

<template>
  <div v-if="!isLoading" class="flex items-center space-x-2 *:text-destructive">
    <span class="text-sm font-semibold"><User /></span>
    <span class="text-sm">{{ stream?.viewers }}</span>
  </div>
</template>
