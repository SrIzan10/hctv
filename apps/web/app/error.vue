<script setup lang="ts">
import * as Sentry from '@sentry/nuxt';
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

onMounted(() => {
  Sentry.captureException(props.error);
});

function handleClear() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
    <h1 class="text-4xl font-bold">{{ error.statusCode || 'Error' }}</h1>
    <p class="text-muted-foreground">
      {{ error.statusCode === 404 ? 'This page could not be found.' : 'An unexpected error has occurred.' }}
    </p>
    <button class="rounded-md border px-4 py-2 text-sm" @click="handleClear">Go home</button>
  </div>
</template>
