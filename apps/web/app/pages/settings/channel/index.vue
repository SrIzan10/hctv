<script setup lang="ts">
definePageMeta({ middleware: 'protected' });

// settings/channel/page.tsx: forward to the personal channel's settings, keeping ?tab=
const route = useRoute();
const { data } = await useFetch<{ name: string | null }>('/api/pages/settings-personal-channel');

if (data.value?.name) {
  const tab = typeof route.query.tab === 'string' && route.query.tab ? route.query.tab : 'general';
  await navigateTo(`/settings/channel/${data.value.name}?tab=${tab}`, { replace: true });
}
</script>

<template>
  <!-- lil easter egg i doubt anyone will see -->
  <p>erm</p>
</template>
