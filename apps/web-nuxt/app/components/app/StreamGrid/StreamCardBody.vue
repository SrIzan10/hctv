<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import type { Channel, StreamInfo } from '@hctv/db';

defineProps<{ stream: StreamInfo & { channel: Channel } }>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      class="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-[box-shadow] duration-150 group-hover:ring-2 group-hover:ring-foreground/30"
    >
      <img
        :src="`/api/stream/thumb/${stream.channel.name}`"
        :alt="stream.title"
        class="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div v-if="stream.isLive" class="absolute inset-x-2 top-2 flex items-center justify-between">
        <span
          class="rounded-md bg-live px-1.5 py-0.5 text-xs font-bold leading-none text-live-foreground"
        >
          {{ stream.channel.is247 ? '24/7' : 'Live' }}
        </span>
      </div>
      <span
        v-if="stream.isLive"
        class="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium leading-none tabular-nums text-white"
      >
        {{ stream.viewers.toLocaleString() }} watching
      </span>
    </div>
    <div class="flex items-start gap-3">
      <Avatar class="h-9 w-9 shrink-0">
        <AvatarImage
          :src="stream.channel.pfpUrl"
          :alt="stream.channel.name"
          loading="lazy"
          decoding="async"
        />
        <AvatarFallback class="text-xs">
          {{ stream.channel.name.slice(0, 2).toUpperCase() }}
        </AvatarFallback>
      </Avatar>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[15px] font-bold leading-snug">{{ stream.title }}</p>
        <p class="truncate text-sm text-muted-foreground">{{ stream.channel.name }}</p>
        <p v-if="stream.category" class="truncate text-sm text-muted-foreground">
          {{ stream.category }}
        </p>
      </div>
    </div>
  </div>
</template>
