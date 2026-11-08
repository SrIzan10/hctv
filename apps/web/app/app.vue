<script setup lang="ts">
import ConfirmHost from '~/components/app/ConfirmHost.vue';

useHead({
  htmlAttrs: { lang: 'en' },
  title: 'hackclub.tv',
  meta: [{ name: 'description', content: "Hack Club's livestreaming platform" }],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster />
  <ConfirmHost />
</template>
