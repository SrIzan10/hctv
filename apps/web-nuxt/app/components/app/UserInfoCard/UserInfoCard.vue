<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import type { StreamInfo, Channel } from '@hctv/db';
import FollowButton from './follow.vue';
import FollowCountText from './followCount.vue';
import StreamUptime from './streamUptime.vue';
import ViewerCount from './viewerCount.vue';
import Preview from '~/components/ui/channel-desc-fancy-area/Preview.vue';

const props = defineProps<Props>();

const { stream } = useStreamLive(() => props.streamInfo.username);
const { channels: personalChannels } = usePersonalChannels();
const isLive = computed(() => stream.value?.isLive ?? props.streamInfo.isLive);
const canEdit = computed(() =>
  personalChannels.value.some((channel) => channel.username === props.streamInfo.username)
);

interface Props {
  streamInfo: StreamInfo & { channel: Channel };
}
</script>

<template>
  <div class="flex flex-col gap-5 px-4 py-5 md:px-6">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex min-w-0 items-center gap-3 md:gap-4">
        <Avatar
          :class="[
            'h-12 w-12 shrink-0 md:h-14 md:w-14',
            isLive && 'ring-2 ring-live ring-offset-2 ring-offset-background',
          ]"
        >
          <AvatarImage :src="streamInfo.channel.pfpUrl" :alt="streamInfo.username" />
          <AvatarFallback>{{ streamInfo.username[0]?.toUpperCase() }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold leading-tight md:text-2xl">
            {{ streamInfo.title }}
          </h1>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-semibold">{{ streamInfo.username }}</span>
            <FollowCountText :channel="streamInfo.username" />
            <ViewerCount />
            <StreamUptime />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink v-if="canEdit" :to="`/settings/channel/${streamInfo.username}?tab=stream`">
          <Button variant="outline" size="sm">
            <Pencil />
            Edit stream
          </Button>
        </NuxtLink>
        <FollowButton :channel="streamInfo.username" />
      </div>
    </div>
    <div v-if="streamInfo.channel.description" class="max-w-[72ch] text-sm leading-relaxed">
      <Preview :text-value="streamInfo.channel.description" />
    </div>
  </div>
</template>
