<script setup lang="ts">
import { computed } from 'vue';
import { Bell, Key, MessageSquareWarning, Settings, Users, Wrench } from '@lucide/vue';
import type { Channel, StreamInfo } from '@hctv/db';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import ChannelSelect from '~/components/app/ChannelSelect/ChannelSelect.vue';
import GeneralTab from '~/components/settings/channel/GeneralTab.vue';
import IntegrationsTab from '~/components/settings/channel/IntegrationsTab.vue';
import ManagersTab from '~/components/settings/channel/ManagersTab.vue';
import ModerationTab from '~/components/settings/channel/ModerationTab.vue';
import NotificationsTab from '~/components/settings/channel/NotificationsTab.vue';
import StreamingTab from '~/components/settings/channel/StreamingTab.vue';
import type { ChannelSettingsResponse } from '~/components/settings/channel/types';

definePageMeta({ middleware: 'protected' });

const route = useRoute();
const router = useRouter();
const channelName = computed(() => String(route.params.channelName));

// 401 -> login, 404/403 -> home (the Next page redirected the same way)
const { data, error } = await useFetch<ChannelSettingsResponse>('/api/pages/settings-channel', {
  query: computed(() => ({ name: channelName.value })),
});

if (error.value) {
  if (error.value.statusCode === 401) {
    await navigateTo('/auth/hackclub', { external: true });
  } else {
    await navigateTo('/');
  }
}

// nuqs `tab` query state (default 'general')
const selTab = computed({
  get: () => (typeof route.query.tab === 'string' && route.query.tab ? route.query.tab : 'general'),
  set: (value: string) => {
    const query = { ...route.query };
    if (value === 'general') delete query.tab;
    else query.tab = value;
    router.replace({ query });
  },
});

// useOwnedChannels: channels the user owns or manages, for the switcher
const { data: ownedStreams } = useFetch<(StreamInfo & { channel: Channel })[]>('/api/stream/info', {
  key: 'stream-info-owned',
  query: { owned: 'true' },
  server: false,
  lazy: true,
  default: () => [],
});
const ownedChannels = computed(() => (ownedStreams.value ?? []).map((c) => c.channel));

async function onChannelSelect(value: string) {
  if (value === 'create') {
    await navigateTo('/settings/channel/create');
  } else {
    await navigateTo(`/settings/channel/${value}?tab=${selTab.value}`);
  }
}
</script>

<template>
  <div v-if="data" :key="data.channel.id" class="container max-w-4xl mx-auto py-6 px-4">
    <div class="mb-6 flex">
      <div class="flex items-center gap-4 mb-4">
        <Avatar class="h-16 w-16">
          <AvatarImage :src="data.channel.pfpUrl" :alt="data.channel.name" />
          <AvatarFallback>{{ data.channel.name[0]?.toUpperCase() }}</AvatarFallback>
        </Avatar>
        <div>
          <h1 class="text-3xl font-bold">{{ data.channel.name }}</h1>
          <p class="text-mantle-foreground">Channel Settings</p>
          <div class="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {{ data.channel.followers.length }} follower{{
                data.channel.followers.length !== 1 ? 's' : ''
              }}
            </Badge>
            <Badge v-if="data.isOwner" variant="outline">Owner</Badge>
          </div>
        </div>
      </div>
      <div class="flex-1" />
      <div>
        <ChannelSelect
          :channel-list="ownedChannels"
          include-create
          :value="data.channel.name"
          @select="onChannelSelect"
        />
      </div>
    </div>

    <Tabs v-model="selTab" class="w-full">
      <TabsList :class="`grid w-full ${data.isPersonal ? 'grid-cols-5' : 'grid-cols-6'}`">
        <TabsTrigger value="general" class="flex items-center gap-2">
          <Settings class="h-4 w-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="stream" class="flex items-center gap-2">
          <Key class="h-4 w-4" />
          Streaming
        </TabsTrigger>
        <TabsTrigger v-if="!data.isPersonal" value="managers" class="flex items-center gap-2">
          <Users class="h-4 w-4" />
          Managers
        </TabsTrigger>
        <TabsTrigger value="notifications" class="flex items-center gap-2">
          <Bell class="h-4 w-4" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="moderation" class="flex items-center gap-2">
          <MessageSquareWarning class="h-4 w-4" />
          Moderation
        </TabsTrigger>
        <TabsTrigger value="integrations" class="flex items-center gap-2">
          <Wrench class="size-4" />
          Integrations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralTab
          :channel="data.channel"
          :is-owner="data.isOwner"
          :is-personal="data.isPersonal"
          :tab="selTab"
        />
      </TabsContent>

      <TabsContent value="stream">
        <StreamingTab :channel="data.channel" />
      </TabsContent>

      <TabsContent v-if="!data.isPersonal" value="managers">
        <ManagersTab :channel="data.channel" :is-owner="data.isOwner" />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationsTab :channel="data.channel" />
      </TabsContent>

      <TabsContent value="moderation">
        <ModerationTab :channel="data.channel" />
      </TabsContent>

      <TabsContent value="integrations">
        <IntegrationsTab :channel="data.channel" />
      </TabsContent>
    </Tabs>
  </div>
</template>
