<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { ExternalLink, Loader2, Monitor, Settings } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import ChannelSelect from '~/components/app/ChannelSelect/ChannelSelect.vue';
import ChatPanel from '~/components/app/ChatPanel/ChatPanel.vue';
import DashboardPanel from '~/components/app/Dashboard/DashboardPanel.vue';
import MultistreamQuickList from '~/components/app/Dashboard/MultistreamQuickList.vue';
import StreamHealthCard from '~/components/app/StreamHealth/StreamHealthCard.vue';
import StreamPlayer from '~/components/app/StreamPlayer/StreamPlayer.vue';
import CopyField from '~/components/settings/CopyField.vue';
import { callAction } from '~/lib/actions';
import { cn } from '~/lib/utils';
import { getMediamtxClientRegionOptions } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import type { StreamHealthReport } from '#shared/types/streamHealth';

definePageMeta({ middleware: 'protected' });

// the player, chat and uptime components read the channel from route.params.username
const route = useRoute();
const channelName = computed(() => String(route.params.username));

type DashboardResponse = {
  channel: { id: string; name: string; pfpUrl: string; is247: boolean };
  stream: { username: string; title: string; category: string; region: string } | null;
  followerCount: number;
  recentFollowers: { id: string; followedAt: string; name: string; pfpUrl: string }[];
};

const { data, error, refresh } = await useFetch<DashboardResponse>('/api/pages/dashboard', {
  query: computed(() => ({ name: channelName.value })),
});

if (error.value) {
  if (error.value.statusCode === 401) {
    await navigateTo('/auth/hackclub', { external: true });
  } else {
    await navigateTo('/');
  }
}

useHead({ title: computed(() => `Stream manager · ${channelName.value}`) });

// followers and the activity list change slowly; live stats come from the 5 s stream poll
useIntervalFn(() => void refresh(), 30_000);

const { stream: live } = useStreamLive(channelName, true);
const isLive = computed(() => Boolean(live.value?.isLive));

const { data: health } = useNuxtData<StreamHealthReport>(`stream-health-${channelName.value}`);
const healthIssues = computed(
  () => health.value?.checks.filter((check) => check.status === 'warn').length ?? 0
);

// uptime
const now = ref(Date.now());
useIntervalFn(() => (now.value = Date.now()), 1000);
const uptime = computed(() => {
  if (!isLive.value || !live.value?.startedAt) return '—';
  const total = Math.max(
    0,
    Math.floor((now.value - new Date(live.value.startedAt).getTime()) / 1000)
  );
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
});

// channel switcher
const { data: ownedStreams } = useFetch<
  { channel: { id: string; name: string; pfpUrl: string } }[]
>('/api/stream/info', {
  key: 'stream-info-owned',
  query: { owned: 'true' },
  server: false,
  lazy: true,
  default: () => [],
});
// the current channel until the list loads, so the switcher never shows a bare placeholder
const ownedChannels = computed(() => {
  const owned = (ownedStreams.value ?? []).map((s) => s.channel);
  return owned.length || !data.value ? owned : [data.value.channel];
});

// stream info form
const title = ref('');
const category = ref('');
const isSavingInfo = ref(false);
watch(
  () => data.value?.stream,
  (stream) => {
    title.value = stream?.title ?? '';
    category.value = stream?.category ?? '';
  },
  { immediate: true }
);
const isInfoDirty = computed(
  () => title.value !== data.value?.stream?.title || category.value !== data.value?.stream?.category
);

async function saveInfo() {
  if (!data.value?.stream) return;
  isSavingInfo.value = true;
  try {
    const res = await callAction('editStreamInfo', {
      username: data.value.stream.username,
      title: title.value,
      category: category.value,
    });
    if (res.success) {
      toast.success('Stream info updated');
      await refresh();
    } else {
      toast.error(res.error ?? 'Could not update stream info');
    }
  } finally {
    isSavingInfo.value = false;
  }
}

// connect
const serverOptions = getMediamtxClientRegionOptions();
const ingestProtocol = ref<'srt' | 'rtmp'>('srt');
const region = ref<MediaMTXRegion>('hq');
const { streamKey } = useChannelStreamKey(channelName);
const { srtUrl, rtmpServerUrl, rtmpStreamKey } = useIngestUrls(channelName, streamKey, region);
const selectedServerLabel = computed(() => {
  const server = serverOptions.find((option) => option.value === region.value);
  return server ? `${server.label} ${server.emoji}` : '';
});

function scrollToHealth() {
  document.getElementById('stream-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div v-if="data" class="flex min-w-0 flex-col xl:h-[calc(100vh-4rem)]">
    <!-- status bar -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-mantle px-4 py-2.5 md:px-6">
      <ChannelSelect
        :channel-list="ownedChannels"
        :value="channelName"
        trigger-class-name="h-9 w-48"
        @select="(value: string) => navigateTo(`/dashboard/${value}`)"
      />

      <!-- live state comes from a client-side poll: render it only once it has data, so the server
           render and the first client frame match and nothing flashes "Offline" -->
      <ClientOnly>
        <div v-if="live" class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <span
            :class="
              cn(
                'rounded-full px-2.5 py-0.5 text-[13px] font-bold',
                isLive ? 'bg-live text-live-foreground' : 'bg-muted text-muted-foreground'
              )
            "
          >
            {{ isLive ? 'Live' : 'Offline' }}
          </span>

          <dl class="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <dt class="text-[13px] text-muted-foreground">Uptime</dt>
              <dd class="font-bold tabular-nums">{{ uptime }}</dd>
            </div>
            <div>
              <dt class="text-[13px] text-muted-foreground">Viewers</dt>
              <dd class="font-bold tabular-nums">{{ isLive ? (live?.viewers ?? 0) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-[13px] text-muted-foreground">Followers</dt>
              <dd class="font-bold tabular-nums">{{ data.followerCount }}</dd>
            </div>
            <div>
              <dt class="text-[13px] text-muted-foreground">Health</dt>
              <dd class="font-bold">
                <template v-if="!isLive">—</template>
                <a
                  v-else-if="healthIssues > 0"
                  href="#stream-health"
                  class="text-warning hover:underline"
                  @click.prevent="scrollToHealth"
                >
                  {{ healthIssues === 1 ? '1 issue' : `${healthIssues} issues` }}
                </a>
                <template v-else>Good</template>
              </dd>
            </div>
          </dl>
        </div>
        <div v-else class="flex items-center gap-6" aria-label="Loading stream status">
          <Skeleton class="h-6 w-14 rounded-full" />
          <Skeleton v-for="i in 4" :key="i" class="h-9 w-16" />
        </div>
        <template #fallback>
          <div class="flex items-center gap-6" aria-label="Loading stream status">
            <Skeleton class="h-6 w-14 rounded-full" />
            <Skeleton v-for="i in 4" :key="i" class="h-9 w-16" />
          </div>
        </template>
      </ClientOnly>

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <Button as-child variant="outline" size="sm">
          <NuxtLink to="/stream"><Monitor />Stream from browser</NuxtLink>
        </Button>
        <Button as-child variant="outline" size="sm">
          <NuxtLink :to="`/${channelName}`" target="_blank"><ExternalLink />View channel</NuxtLink>
        </Button>
        <Button as-child variant="ghost" size="icon" aria-label="Channel settings">
          <NuxtLink :to="`/settings/channel/${channelName}`"><Settings /></NuxtLink>
        </Button>
      </div>
    </div>

    <!-- panels -->
    <div
      class="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_20rem_22rem]"
    >
      <div class="flex min-w-0 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto">
        <DashboardPanel title="Stream preview" class="shrink-0">
          <div class="aspect-video w-full bg-black">
            <StreamPlayer start-muted>
              <template #offline>
                <p class="text-lg font-bold">You're offline</p>
                <p class="max-w-sm text-sm text-white/70">
                  Start streaming in OBS with the details under Connect, and your stream shows up
                  here.
                </p>
              </template>
            </StreamPlayer>
          </div>
        </DashboardPanel>

        <div class="grid gap-3 2xl:grid-cols-2">
          <DashboardPanel id="stream-health" title="Stream health" class="shrink-0 scroll-mt-3">
            <StreamHealthCard :channel-name="channelName" variant="bare" />
          </DashboardPanel>

          <DashboardPanel title="Recent followers" class="shrink-0">
            <template #actions>
              <span class="text-[13px] text-muted-foreground tabular-nums">
                {{ data.followerCount }} total
              </span>
            </template>
            <ul v-if="data.recentFollowers.length" class="max-h-80 divide-y overflow-y-auto">
              <li
                v-for="follower in data.recentFollowers"
                :key="follower.id"
                class="flex items-center gap-2.5 px-3 py-2"
              >
                <Avatar class="size-6">
                  <AvatarImage :src="follower.pfpUrl" :alt="follower.name" />
                  <AvatarFallback class="text-[11px]">
                    {{ follower.name[0]?.toUpperCase() }}
                  </AvatarFallback>
                </Avatar>
                <NuxtLink
                  :to="`/${follower.name}`"
                  class="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {{ follower.name }}
                </NuxtLink>
                <NuxtTime
                  :datetime="follower.followedAt"
                  relative
                  class="shrink-0 text-[13px] text-muted-foreground"
                />
              </li>
            </ul>
            <p v-else class="p-3 text-[13px] text-muted-foreground">No followers yet.</p>
          </DashboardPanel>
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto">
        <DashboardPanel title="Stream info" class="shrink-0">
          <form v-if="data.stream" class="grid gap-3 p-3" @submit.prevent="saveInfo">
            <div class="grid gap-1.5">
              <Label for="dashboard-title" class="text-[13px]">Title</Label>
              <Input id="dashboard-title" v-model="title" required maxlength="140" />
            </div>
            <div class="grid gap-1.5">
              <Label for="dashboard-category" class="text-[13px]">Category</Label>
              <Input id="dashboard-category" v-model="category" required maxlength="60" />
            </div>
            <Button type="submit" size="sm" :disabled="!isInfoDirty || isSavingInfo">
              <Loader2 v-if="isSavingInfo" class="animate-spin" />
              Save
            </Button>
          </form>
        </DashboardPanel>

        <DashboardPanel title="Multistream" class="shrink-0">
          <template #actions>
            <NuxtLink
              :to="`/settings/channel/${channelName}?tab=stream`"
              class="text-[13px] font-medium text-link hover:underline"
              >Manage</NuxtLink
            >
          </template>
          <MultistreamQuickList :channel-name="channelName" />
        </DashboardPanel>

        <DashboardPanel title="Connect" class="shrink-0" body-class="grid gap-3 p-3">
          <div class="grid grid-cols-2 gap-2">
            <Select v-model="ingestProtocol">
              <SelectTrigger class="h-8 w-full" aria-label="Protocol">
                <SelectValue>{{ ingestProtocol === 'srt' ? 'SRT' : 'RTMP' }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="rtmp">RTMP</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="region">
              <SelectTrigger class="h-8 w-full" aria-label="Server">
                <SelectValue>{{ selectedServerLabel }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="server in serverOptions"
                  :key="server.value"
                  :value="server.value"
                >
                  {{ server.label }} {{ server.emoji }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CopyField
            v-if="ingestProtocol === 'srt'"
            label="Server URL"
            :value="srtUrl"
            secret
            copied-message="Server URL copied"
          />
          <template v-else>
            <CopyField label="Server" :value="rtmpServerUrl" copied-message="Server copied" />
            <CopyField
              label="Stream key"
              :value="rtmpStreamKey"
              secret
              copied-message="Stream key copied"
            />
          </template>
        </DashboardPanel>
      </div>

      <div class="h-[560px] min-w-0 lg:col-span-2 xl:col-span-1 xl:h-auto xl:min-h-0">
        <ChatPanel embedded />
      </div>
    </div>
  </div>
</template>
