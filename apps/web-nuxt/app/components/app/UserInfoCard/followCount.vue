<script setup lang="ts">
const props = defineProps<{ channel: string }>();

// TODO: rerender the component when the user follows/unfollows the channel
const { data, error, status } = useFetch<{ count: number }>(
  () => `/api/stream/followers/${props.channel}`,
  { lazy: true, server: false }
);
</script>

<template>
  <p v-if="error" class="text-sm italic text-muted-foreground">Failed to load followers</p>
  <p v-else-if="status === 'pending' || !data" class="text-sm italic text-muted-foreground">
    Loading followers...
  </p>
  <p v-else class="text-sm text-muted-foreground">
    {{ data.count }} follower{{ data.count === 1 ? '' : 's' }}
  </p>
</template>
