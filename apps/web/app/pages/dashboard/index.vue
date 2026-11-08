<script setup lang="ts">
definePageMeta({ middleware: 'protected' });

// "Go live" lands here: open the stream manager of the user's personal channel
const { data } = await useFetch<{ name: string | null }>('/api/pages/settings-personal-channel');

await navigateTo(data.value?.name ? `/dashboard/${data.value.name}` : '/onboarding', {
  replace: true,
});
</script>

<template>
  <div />
</template>
