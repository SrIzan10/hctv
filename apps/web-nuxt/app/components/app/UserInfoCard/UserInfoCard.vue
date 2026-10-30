<script setup lang="ts">
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import type { StreamInfo, Channel } from '@hctv/db';
import FollowButton from './follow.vue';
import FollowCountText from './followCount.vue';
import StreamUptime from './streamUptime.vue';
import ViewerCount from './viewerCount.vue';
import Preview from '~/components/ui/channel-desc-fancy-area/Preview.vue';

defineProps<Props>();

interface Props {
  streamInfo: StreamInfo & { channel: Channel };
}
</script>

<template>
  <div class="bg-mantle p-3 md:p-4 border-b shrink-0 flex flex-col gap-3 md:h-48">
    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 flex-shrink-0">
      <div class="flex min-w-0 items-center gap-3 md:gap-4">
        <Avatar class="h-12 w-12 md:h-16 md:w-16 shrink-0">
          <AvatarImage :src="streamInfo.channel.pfpUrl" :alt="streamInfo.username" />
        </Avatar>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold leading-tight md:text-2xl">
            {{ streamInfo.title }}
          </h1>
          <p class="truncate text-sm text-muted-foreground md:text-foreground">
            {{ streamInfo.username }}
          </p>
          <FollowCountText :channel="streamInfo.username" />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-4">
        <ViewerCount />
        <StreamUptime />
        <FollowButton :channel="streamInfo.username" />
      </div>
    </div>
    <div class="max-h-20 overflow-y-auto md:max-h-32">
      <Preview :text-value="streamInfo.channel.description" />
    </div>
  </div>
</template>
