<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';

defineProps<{
  name?: string | null;
  subtitle?: string;
  pfpUrl?: string | null;
}>();
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-3">
    <Avatar class="h-9 w-9 shrink-0">
      <AvatarImage v-if="pfpUrl" :src="pfpUrl" :alt="name ?? ''" />
      <AvatarFallback class="text-xs font-semibold">
        {{ (name ?? '?')[0]?.toUpperCase() }}
      </AvatarFallback>
    </Avatar>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-bold">{{ name ?? 'Unknown user' }}</p>
      <p v-if="subtitle" class="truncate text-xs text-muted-foreground">{{ subtitle }}</p>
    </div>
    <slot />
  </li>
</template>
