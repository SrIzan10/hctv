<script setup lang="ts">
import { ref } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const keyVisible = ref(false);

const fields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'channels',
    label: 'Notification channels',
    value: props.channel.notifChannels.join('\n'),
    textArea: true,
    textAreaRows: 4,
    custom: true,
  },
];

async function handleNotifChannelsActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Notification channels updated');
    await refreshNuxtData();
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Integrations</CardTitle>
      <CardDescription>OBS overlays, Slack... everything in one neat place!</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold mb-2">Chat overlay</h3>
          <p class="text-sm text-mantle-foreground mb-4">
            Add a 300x600 browser source with this and enjoy!
          </p>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input
                :type="keyVisible ? 'text' : 'password'"
                :value="`https://hackclub.tv/chat/${channel.name}?grant=${channel.obsChatGrantToken}`"
                readonly
                class="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-sm"
              />
            </div>
            <Button variant="outline" size="icon-sm" @click="keyVisible = !keyVisible">
              <EyeOff v-if="keyVisible" class="size-4" />
              <Eye v-else class="size-4" />
            </Button>
          </div>
        </div>
        <SettingsForm
          :fields="fields"
          action="updateNotificationChannels"
          submit-text="Save notification channels"
          @action-complete="handleNotifChannelsActionComplete"
        >
          <template #field-channels="{ value, update, nameAttr }">
            <div>
              <Textarea
                :name="nameAttr"
                :model-value="typeof value === 'string' ? value : ''"
                :disabled="channel.is247"
                :rows="4"
                :placeholder="
                  channel.is247
                    ? 'Notifications are disabled for 24/7 channels'
                    : 'Enter channel IDs, one per line'
                "
                @update:model-value="(v: string | number) => update(v)"
              />
              <p class="text-xs text-muted-foreground mt-1">
                {{
                  channel.is247
                    ? '24/7 channels do not send go-live notifications, so notification channels cannot be edited.'
                    : 'Enter one channel ID per line. You can find channel IDs in their URLs.'
                }}
              </p>
            </div>
          </template>
        </SettingsForm>
      </div>
    </CardContent>
  </Card>
</template>
