<script setup lang="ts">
import { Circle } from '@lucide/vue';

defineProps<{ message: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
    <Circle class="h-8 w-8 opacity-20" />
    <p class="text-sm">{{ message }}</p>
  </div>
</template>
