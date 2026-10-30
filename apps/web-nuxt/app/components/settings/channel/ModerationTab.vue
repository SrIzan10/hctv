<script setup lang="ts">
import { UserMinus } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import AddChatBotModeratorDialog from './AddChatBotModeratorDialog.vue';
import AddChatModeratorDialog from './AddChatModeratorDialog.vue';
import ChannelRoleBadges from './ChannelRoleBadges.vue';
import { runToastAction } from './actions';
import { withPlatformAdmin } from './types';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const moderationFields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'slowModeSeconds',
    label: 'Slow mode (seconds)',
    type: 'number',
    value: props.channel.chatSettings?.slowModeSeconds ?? 0,
    description: 'Users can send one message per interval. Set 0 to disable.',
  },
  {
    name: 'maxMessageLength',
    label: 'Max message length',
    type: 'number',
    value: props.channel.chatSettings?.maxMessageLength ?? 400,
    description: 'Maximum allowed message length in characters.',
  },
  {
    name: 'rateLimitCount',
    label: 'Messages per window',
    type: 'number',
    value: props.channel.chatSettings?.rateLimitCount ?? 8,
    description: 'How many messages a user can send in the rate limit window.',
  },
  {
    name: 'rateLimitWindowSeconds',
    label: 'Rate window (seconds)',
    type: 'number',
    value: props.channel.chatSettings?.rateLimitWindowSeconds ?? 10,
    description: 'Window size used for spam protection.',
  },
  {
    name: 'blockedTerms',
    label: 'Blocked terms',
    value: (props.channel.chatSettings?.blockedTerms ?? []).join('\n'),
    textArea: true,
    textAreaRows: 8,
    description:
      'One term per line (or comma-separated). Messages containing these terms are blocked.',
  },
];

function personalChannelOf(list: (typeof props.channel)['managerPersonalChannels'], userId: string) {
  return list.find((candidate) => candidate?.ownerId === userId);
}

function removeModerator(userId: string) {
  void runToastAction(
    'removeChatModerator',
    { channelId: props.channel.id, userId },
    {
      loading: 'Removing moderator...',
      success: 'Moderator removed',
      error: 'Failed to remove moderator',
    }
  );
}

function removeBotModerator(botId: string) {
  void runToastAction(
    'removeChatBotModerator',
    { channelId: props.channel.id, botId },
    {
      loading: 'Removing bot moderator...',
      success: 'Bot moderator removed',
      error: 'Failed to remove bot moderator',
    }
  );
}

async function handleModerationActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Moderation settings updated');
    await refreshNuxtData();
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Chat Moderation</CardTitle>
      <CardDescription>
        Configure rate limits, slow mode, and blocked words for this channel's live chat.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Moderators</h3>
          <div class="flex gap-2">
            <AddChatModeratorDialog
              :channel-id="channel.id"
              :existing-moderators="[
                channel.owner.id,
                ...channel.managers.map((manager) => manager.id),
                ...channel.chatModerators.map((moderator) => moderator.id),
              ]"
            />
            <AddChatBotModeratorDialog
              :channel-id="channel.id"
              :bot-accounts="channel.allBotAccounts"
              :existing-bot-moderators="channel.chatModeratorBots.map((bot) => bot.id)"
            />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 border rounded-lg">
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="channel.owner.pfpUrl" />
                <AvatarFallback>{{ channel.owner.slack_id[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ channel.ownerPersonalChannel?.name }}</p>
                <p class="text-sm text-mantle-foreground">Owner</p>
              </div>
            </div>
            <ChannelRoleBadges :roles="withPlatformAdmin(['owner', 'chatModerator'], channel.owner.isAdmin)" />
          </div>

          <div
            v-for="manager in channel.managers"
            :key="manager.id"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="manager.pfpUrl" />
                <AvatarFallback>{{ personalChannelOf(channel.managerPersonalChannels, manager.id)?.name }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ personalChannelOf(channel.managerPersonalChannels, manager.id)?.name }}</p>
                <p class="text-sm text-mantle-foreground">Manager</p>
              </div>
            </div>
            <ChannelRoleBadges :roles="withPlatformAdmin(['manager', 'chatModerator'], manager.isAdmin)" />
          </div>

          <div
            v-for="moderator in channel.chatModerators"
            :key="moderator.id"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="moderator.pfpUrl" />
                <AvatarFallback>{{ personalChannelOf(channel.chatModeratorPersonalChannels, moderator.id)?.name }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ personalChannelOf(channel.chatModeratorPersonalChannels, moderator.id)?.name }}</p>
                <p class="text-sm text-mantle-foreground">Chat moderator</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <ChannelRoleBadges :roles="withPlatformAdmin(['chatModerator'], moderator.isAdmin)" />
              <Button variant="outline" size="sm" @click="removeModerator(moderator.id)">
                <UserMinus class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            v-for="botAccount in channel.chatModeratorBots"
            :key="botAccount.id"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="botAccount.pfpUrl" />
                <AvatarFallback>{{ botAccount.slug[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ botAccount.displayName }}</p>
                <p class="text-sm text-mantle-foreground">@{{ botAccount.slug }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <ChannelRoleBadges :roles="['botModerator']" />
              <Button variant="outline" size="sm" @click="removeBotModerator(botAccount.id)">
                <UserMinus class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p
            v-if="channel.chatModerators.length === 0 && channel.chatModeratorBots.length === 0"
            class="text-mantle-foreground text-center py-4"
          >
            No extra chat moderators yet.
          </p>
        </div>
      </div>

      <Separator />

      <SettingsForm
        :fields="moderationFields"
        action="updateChatModeration"
        submit-text="Save moderation settings"
        @action-complete="handleModerationActionComplete"
      />
    </CardContent>
  </Card>
</template>
