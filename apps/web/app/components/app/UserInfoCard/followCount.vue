<script setup lang="ts">
const props = defineProps<{ channel: string }>();

// TODO: rerender the component when the user follows/unfollows the channel
const { data, error } = useFetch<{ count: number }>(
  () => `/api/stream/followers/${props.channel}`,
  { lazy: true, server: false }
);
</script>

<template>
  <span v-if="data && !error" class="tabular-nums text-muted-foreground">
    {{ data.count.toLocaleString() }} follower{{ data.count === 1 ? '' : 's' }}
  </span>
</template>
