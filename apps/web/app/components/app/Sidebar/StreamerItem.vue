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
        <img
          :src="streamer.channel.pfpUrl"
          :alt="streamer.username"
          :class="[
            'h-8 w-8 flex-shrink-0 rounded-full object-cover',
            streamer.isLive
              ? 'ring-2 ring-live ring-offset-2 ring-offset-sidebar'
              : 'opacity-60 grayscale-[40%]',
          ]"
          loading="lazy"
        />

        <div v-if="!isCollapsed" class="flex flex-1 flex-col items-start overflow-hidden">
          <div class="flex w-full items-center justify-between">
            <span class="truncate font-medium text-sm leading-none">
              {{ streamer.username }}
            </span>
            <span v-if="streamer.isLive" class="text-xs tabular-nums text-muted-foreground">
              {{ streamer.viewers.toLocaleString() }}
            </span>
          </div>
          <span class="truncate text-xs text-muted-foreground w-full text-left">
            {{ streamer.isLive ? streamer.title || streamer.category || 'Live' : 'Offline' }}
          </span>
        </div>
      </button>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
