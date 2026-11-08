<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ icon: Component; title: string; description: string }>();
</script>

<template>
  <div class="flex items-start justify-between gap-4 mb-6">
    <div class="flex items-start gap-3">
      <div class="mt-0.5 text-muted-foreground">
        <component :is="icon" class="h-4 w-4" />
      </div>
      <div>
        <h2 class="text-base font-semibold leading-tight pb-0 mb-0">{{ title }}</h2>
        <p class="text-sm text-muted-foreground mt-0.5">{{ description }}</p>
      </div>
    </div>
    <slot name="action" />
  </div>
</template>
