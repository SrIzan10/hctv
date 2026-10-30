<script setup lang="ts">
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

defineProps<{
  streamer: StreamInfoResponse[0];
  isCollapsed: boolean;
}>();

const router = useRouter();
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton
      as-child
      :tooltip="streamer.username"
      class="h-12"
      @click="router.push(`/${streamer.username}`)"
    >
      <button class="flex w-full items-center gap-3">
        <div class="relative flex-shrink-0">
          <img
            :src="streamer.channel.pfpUrl"
            :alt="streamer.username"
            class="h-8 w-8 rounded-full object-cover"
            loading="lazy"
          />
          <span
            v-if="streamer.isLive"
            class="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-2 ring-background"
          >
            <span class="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </span>
        </div>

        <div v-if="!isCollapsed" class="flex flex-1 flex-col items-start overflow-hidden">
          <div class="flex w-full items-center justify-between">
            <span class="truncate font-medium text-sm leading-none">
              {{ streamer.username }}
            </span>
            <div v-if="streamer.isLive" class="flex items-center gap-1 text-xs text-red-500">
              <span class="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>{{ streamer.viewers }}</span>
            </div>
          </div>
          <span class="truncate text-xs text-muted-foreground w-full text-left">
            {{ streamer.isLive ? streamer.title || streamer.category || 'Live' : 'Offline' }}
          </span>
        </div>
      </button>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
