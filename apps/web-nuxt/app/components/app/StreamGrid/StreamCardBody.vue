<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import type { Channel, StreamInfo } from '@hctv/db';

defineProps<{ stream: StreamInfo & { channel: Channel } }>();
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200 group-hover:shadow-md"
  >
    <div class="relative aspect-video overflow-hidden bg-muted">
      <img
        :src="`/api/stream/thumb/${stream.channel.name}`"
        :alt="stream.title"
        class="absolute inset-0 object-cover"
        loading="lazy"
        decoding="async"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <template v-if="stream.isLive">
        <div class="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2">
          <span
            class="flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
          >
            <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
        </div>
        <div class="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2">
          <span
            class="flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
            {{ stream.viewers.toLocaleString() }}
          </span>
        </div>
      </template>
    </div>
    <div class="flex items-start gap-2 p-2 md:gap-3 md:p-3">
      <Avatar class="h-7 w-7 shrink-0 ring-1 ring-primary/20 md:h-8 md:w-8">
        <AvatarImage
          :src="stream.channel.pfpUrl"
          :alt="stream.channel.name"
          loading="lazy"
          decoding="async"
        />
        <AvatarFallback class="text-[10px]">
          {{ stream.channel.name.slice(0, 2).toUpperCase() }}
        </AvatarFallback>
      </Avatar>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-medium leading-snug md:text-sm">{{ stream.title }}</p>
        <p class="truncate text-[10px] text-muted-foreground md:text-xs">
          {{ stream.channel.name }}
        </p>
        <Badge
          v-if="stream.category"
          variant="secondary"
          class="mt-1 rounded-full px-1.5 py-0 text-[9px] font-medium md:mt-1.5 md:px-2 md:text-[10px]"
        >
          {{ stream.category }}
        </Badge>
      </div>
    </div>
  </div>
</template>
