<script setup lang="ts">
import { UserMinus } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import PersonRow from '~/components/settings/PersonRow.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
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
    description: 'Seconds each person waits between messages. 0 turns it off.',
  },
  {
    name: 'maxMessageLength',
    label: 'Max message length',
    type: 'number',
    value: props.channel.chatSettings?.maxMessageLength ?? 400,
    description: 'Longest message allowed, in characters.',
  },
  {
    name: 'rateLimitCount',
    label: 'Messages per window',
    type: 'number',
    value: props.channel.chatSettings?.rateLimitCount ?? 8,
    description: 'Messages one person can send within the rate window.',
  },
  {
    name: 'rateLimitWindowSeconds',
    label: 'Rate window (seconds)',
    type: 'number',
    value: props.channel.chatSettings?.rateLimitWindowSeconds ?? 10,
    description: 'How long the messages-per-window limit counts over.',
  },
  {
    name: 'blockedTerms',
    label: 'Blocked terms',
    value: (props.channel.chatSettings?.blockedTerms ?? []).join('\n'),
    textArea: true,
    textAreaRows: 8,
    description:
      'One per line, or separated by commas. Messages containing any of them are blocked.',
  },
];

function personalChannelOf(
  list: (typeof props.channel)['managerPersonalChannels'],
  userId: string
) {
  return list.find((candidate) => candidate?.ownerId === userId);
}

function removeModerator(userId: string) {
  void runToastAction(
    'removeChatModerator',
    { channelId: props.channel.id, userId },
    {
      loading: 'Removing moderator...',
      success: 'Moderator removed',
      error: 'Could not remove the moderator. Try again.',
    }
  );
}

function removeBotModerator(botId: string) {
  void runToastAction(
    'removeChatBotModerator',
    { channelId: props.channel.id, botId },
    {
      loading: 'Removing bot moderator...',
      success: 'Bot removed from moderators',
      error: 'Could not remove the bot. Try again.',
    }
  );
}

async function handleModerationActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Chat rules saved');
    await refreshNuxtData();
  }
}
</script>

<template>
  <div>
    <SettingsSection
      title="Moderators"
      description="Moderators can delete messages, time people out and ban them from chat. Owners and managers are moderators automatically."
    >
      <template #aside>
        <div class="flex flex-wrap gap-2">
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
      </template>

      <ul class="divide-y rounded-xl border bg-card">
        <PersonRow
          :name="channel.ownerPersonalChannel?.name"
          :pfp-url="channel.owner.pfpUrl"
          subtitle="Owner"
        >
          <ChannelRoleBadges :roles="withPlatformAdmin(['owner'], channel.owner.isAdmin)" />
        </PersonRow>
        <PersonRow
          v-for="manager in channel.managers"
          :key="manager.id"
          :name="personalChannelOf(channel.managerPersonalChannels, manager.id)?.name"
          :pfp-url="manager.pfpUrl"
          subtitle="Manager"
        >
          <ChannelRoleBadges :roles="withPlatformAdmin(['manager'], manager.isAdmin)" />
        </PersonRow>
        <PersonRow
          v-for="moderator in channel.chatModerators"
          :key="moderator.id"
          :name="personalChannelOf(channel.chatModeratorPersonalChannels, moderator.id)?.name"
          :pfp-url="moderator.pfpUrl"
          subtitle="Chat moderator"
        >
          <ChannelRoleBadges :roles="withPlatformAdmin(['chatModerator'], moderator.isAdmin)" />
          <Button
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-destructive"
            :aria-label="`Remove ${personalChannelOf(channel.chatModeratorPersonalChannels, moderator.id)?.name ?? 'moderator'}`"
            @click="removeModerator(moderator.id)"
          >
            <UserMinus />
          </Button>
        </PersonRow>
        <PersonRow
          v-for="botAccount in channel.chatModeratorBots"
          :key="botAccount.id"
          :name="botAccount.displayName"
          :pfp-url="botAccount.pfpUrl"
          :subtitle="`@${botAccount.slug}`"
        >
          <ChannelRoleBadges :roles="['botModerator']" />
          <Button
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-destructive"
            :aria-label="`Remove ${botAccount.displayName}`"
            @click="removeBotModerator(botAccount.id)"
          >
            <UserMinus />
          </Button>
        </PersonRow>
      </ul>
    </SettingsSection>

    <SettingsSection
      title="Chat rules"
      description="Moderators skip slow mode and rate limits. The length limit and blocked terms apply to everyone."
    >
      <SettingsForm
        :fields="moderationFields"
        two-column
        action="updateChatModeration"
        submit-text="Save chat rules"
        @action-complete="handleModerationActionComplete"
      />
    </SettingsSection>
  </div>
</template>
