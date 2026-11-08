<script setup lang="ts">
import { CalendarDays } from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// `channels` comes from the Preview (one fetch for all mentions instead of one per mention)
const props = defineProps<{
  handle: string;
  channels: StreamInfoResponse;
}>();

// only existing channels get the hover card, everything else renders as plain text
const channel = computed(() =>
  props.channels.find((ch) => ch.username.toLowerCase() === props.handle.toLowerCase())
);
const fallback = computed(() => props.handle.substring(0, 2).toUpperCase());
const url = computed(() => `https://hackclub.tv/${props.handle}`);
const joined = computed(() =>
  channel.value
    ? new Date(channel.value.channel.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''
);
</script>

<template>
  <HoverCard v-if="channel">
    <HoverCardTrigger as-child>
      <a :href="url" target="_blank"><slot /></a>
    </HoverCardTrigger>
    <HoverCardContent class="max-w-xs w-auto">
      <div class="flex justify-between space-x-4">
        <Avatar>
          <AvatarImage :src="channel.channel.pfpUrl" />
          <AvatarFallback>{{ fallback }}</AvatarFallback>
        </Avatar>
        <div class="space-y-1">
          <h4 class="text-sm font-semibold">{{ channel.channel.name }}</h4>
          <p class="text-sm">{{ channel.channel.description }}</p>
          <div class="flex items-center pt-2">
            <CalendarDays class="mr-2 h-4 w-4 opacity-70" />
            <span class="text-xs text-muted-foreground">Joined {{ joined }}</span>
          </div>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
  <slot v-else />
</template>
