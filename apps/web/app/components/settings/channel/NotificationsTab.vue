<script setup lang="ts">
import { BellOff, BellRing } from '@lucide/vue';
import { Switch } from '~/components/ui/switch';
import PersonRow from '~/components/settings/PersonRow.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import { runToastAction } from './actions';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

function personalChannelOf(userId: string) {
  return props.channel.followerPersonalChannels.find((c) => c?.ownerId === userId);
}

function toggleGlobalNotifs() {
  void runToastAction(
    'toggleGlobalChannelNotifs',
    { channelId: props.channel.id },
    {
      loading: 'Updating notifications...',
      success: (data) => `Go-live notifications turned ${data.toggle ? 'on' : 'off'}`,
      error: 'Could not update notifications. Try again.',
    }
  );
}
</script>

<template>
  <div>
    <SettingsSection
      title="Go-live notifications"
      description="Followers who turned on notifications get a Slack DM when this channel goes live."
    >
      <label
        class="flex cursor-pointer items-start justify-between gap-6 rounded-xl border bg-card p-4"
      >
        <span>
          <span class="block text-sm font-bold">Notify followers when I go live</span>
          <span class="mt-0.5 block text-sm text-muted-foreground">
            Each follower can still turn these off for themselves.
          </span>
        </span>
        <Switch
          class="mt-0.5"
          :model-value="channel.streamInfo[0]?.enableNotifications ?? true"
          @update:model-value="toggleGlobalNotifs"
        />
      </label>
    </SettingsSection>

    <SettingsSection
      title="Followers"
      :description="`${channel.followers.length} ${channel.followers.length === 1 ? 'person follows' : 'people follow'} this channel.`"
    >
      <ul
        v-if="channel.followers.length > 0"
        class="max-h-[28rem] divide-y overflow-y-auto rounded-xl border bg-card"
      >
        <PersonRow
          v-for="follower in channel.followers"
          :key="follower.id"
          :name="personalChannelOf(follower.user.id)?.name"
          :pfp-url="personalChannelOf(follower.user.id)?.pfpUrl"
        >
          <span
            :class="[
              'inline-flex items-center gap-1.5 text-xs',
              follower.notifyStream ? 'text-foreground' : 'text-muted-foreground',
            ]"
          >
            <BellRing v-if="follower.notifyStream" class="h-3.5 w-3.5" />
            <BellOff v-else class="h-3.5 w-3.5" />
            {{ follower.notifyStream ? 'Notified' : 'Muted' }}
          </span>
        </PersonRow>
      </ul>
      <div
        v-else
        class="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground"
      >
        No followers yet. They'll show up here once people follow your channel.
      </div>
    </SettingsSection>
  </div>
</template>
