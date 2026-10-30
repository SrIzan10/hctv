<script setup lang="ts">
import { toast } from 'vue-sonner';
import { Textarea } from '~/components/ui/textarea';
import CopyField from '~/components/settings/CopyField.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const fields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'channels',
    label: 'Slack channel IDs',
    value: props.channel.notifChannels.join('\n'),
    textArea: true,
    textAreaRows: 4,
    custom: true,
  },
];

async function handleNotifChannelsActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Slack channels saved');
    await refreshNuxtData();
  }
}
</script>

<template>
  <div>
    <SettingsSection
      title="Chat overlay"
      description="Show your chat on stream. In OBS, add a Browser source sized 300 × 600 with this URL."
    >
      <CopyField
        label="Overlay URL"
        :value="`https://hackclub.tv/chat/${channel.name}?grant=${channel.obsChatGrantToken}`"
        secret
        copied-message="Overlay URL copied"
      />
      <p class="mt-2 text-xs text-muted-foreground">
        The URL contains a private token, so keep it out of screenshots.
      </p>
    </SettingsSection>

    <SettingsSection
      title="Slack announcements"
      description="Post a go-live message in extra Slack channels, on top of #hctv-streams."
    >
      <SettingsForm
        :fields="fields"
        action="updateNotificationChannels"
        submit-text="Save Slack channels"
        @action-complete="handleNotifChannelsActionComplete"
      >
        <template #field-channels="{ value, update, nameAttr }">
          <Textarea
            :name="nameAttr"
            class="font-mono text-xs"
            :model-value="typeof value === 'string' ? value : ''"
            :disabled="channel.is247"
            :rows="4"
            :placeholder="
              channel.is247 ? 'Turned off for 24/7 channels' : 'C0123456789\nC0987654321'
            "
            @update:model-value="(v: string | number) => update(v)"
          />
          <p class="text-xs text-muted-foreground">
            {{
              channel.is247
                ? "24/7 channels don't send go-live messages, so this list can't be edited."
                : 'One channel ID per line. Find it in the channel details in Slack, or at the end of the channel link. The bot posts a test message when you add one.'
            }}
          </p>
        </template>
      </SettingsForm>
    </SettingsSection>
  </div>
</template>
