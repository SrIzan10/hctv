<script setup lang="ts">
import { computed, ref } from 'vue';
import { Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Preview from '~/components/ui/channel-desc-fancy-area/Preview.vue';
import Write from '~/components/ui/channel-desc-fancy-area/Write.vue';
import PfpUpload from '~/components/settings/PfpUpload.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import { callAction } from '~/lib/actions';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{
  channel: ChannelSettingsChannel;
  isOwner: boolean;
  isPersonal: boolean;
  tab: string;
}>();

const confirm = useConfirm();
const isUploading = ref(false);
const uploadError = ref<string | null>(null);
const settingsFormRef = ref<InstanceType<typeof SettingsForm> | null>(null);

const settingsFields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'pfpUrl',
    label: 'Profile Picture',
    type: 'url',
    value: props.channel.pfpUrl,
    custom: true,
  },
  {
    name: 'description',
    label: 'Channel Description',
    value: props.channel.description,
    custom: true,
  },
  { name: 'is247', value: props.channel.is247, custom: true },
];

const usernameFields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'newUsername',
    label: 'New Username',
    type: 'text',
    value: '',
    placeholder: props.channel.name,
    description: 'Only lowercase letters, numbers, underscores, and dashes. Max 20 characters.',
    inputFilter: /[^a-z0-9_-]/g,
    maxChars: 20,
  },
];

const cooldownInfo = computed(() => {
  if (!props.channel.nameLastChanged) {
    return { canChange: true, daysRemaining: 0 };
  }
  const daysSinceLastChange = Math.floor(
    (Date.now() - new Date(props.channel.nameLastChanged).getTime()) / (1000 * 60 * 60 * 24)
  );
  const cooldownDays = 30;
  if (daysSinceLastChange >= cooldownDays) {
    return { canChange: true, daysRemaining: 0 };
  }
  return { canChange: false, daysRemaining: cooldownDays - daysSinceLastChange };
});

async function handleChannelSettingsActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Channel settings updated successfully');
    await refreshNuxtData();
  }
}

async function handleUsernameChangeComplete(result: SettingsFormResult) {
  if (result?.success && result?.newUsername) {
    toast.success('Username changed successfully! Redirecting...');
    await navigateTo(`/settings/channel/${result.newUsername}?tab=${props.tab}`);
  }
}

function onPfpUploaded(update: (v: unknown) => void, url: string) {
  isUploading.value = false;
  update(url);
  toast.success('Profile picture uploaded successfully!');
  setTimeout(() => {
    settingsFormRef.value?.submit();
  }, 0);
}

async function deleteChannel() {
  if (
    await confirm({
      title: 'Delete Channel',
      description:
        'Are you sure you want to delete this channel? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
  ) {
    const result = await callAction('deleteChannel', { channelId: props.channel.id });
    if (result.success) {
      toast.success('Channel deleted successfully');
      await navigateTo('/settings/channel');
    } else {
      toast.error(result.error || 'Failed to delete channel');
    }
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>General Settings</CardTitle>
      <CardDescription>Manage your channel's basic information and settings.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <SettingsForm
        ref="settingsFormRef"
        :fields="settingsFields"
        action="updateChannelSettings"
        submit-text="Save Changes"
        @action-complete="handleChannelSettingsActionComplete"
      >
        <template #field-pfpUrl="{ value, update }">
          <div class="space-y-4">
            <div v-if="value" class="flex items-center space-x-4">
              <Avatar class="h-16 w-16">
                <AvatarImage :src="String(value)" alt="Current profile picture" />
                <AvatarFallback>{{ channel.name[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div class="flex-1">
                <p class="text-sm font-medium">Current profile picture</p>
                <p class="text-xs text-muted-foreground">Click "Upload new image" to replace</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="
                  update('');
                  uploadError = null;
                "
              >
                Remove
              </Button>
            </div>

            <div>
              <PfpUpload
                :has-value="Boolean(value)"
                @upload-begin="
                  isUploading = true;
                  uploadError = null;
                "
                @uploaded="(url: string) => onPfpUploaded(update, url)"
                @upload-error="
                  (message: string) => {
                    isUploading = false;
                    uploadError = message;
                  }
                "
              />

              <p v-if="isUploading" class="mt-2 text-sm text-primary">Uploading...</p>
              <p v-if="uploadError" class="mt-2 text-sm text-red-600">{{ uploadError }}</p>
              <p
                v-if="!value && !isUploading && !uploadError"
                class="mt-2 text-sm text-muted-foreground"
              >
                Upload a profile picture for your channel.
              </p>
            </div>
          </div>
        </template>

        <template #field-description="{ value, update }">
          <div>
            <Tabs default-value="write" class="w-full">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Write
                  :text-value="String(value || '')"
                  @set-text-value="(v: string) => update(v)"
                />
              </TabsContent>
              <TabsContent value="preview">
                <Preview :text-value="String(value || '')" class="h-[159.5px]" />
              </TabsContent>
            </Tabs>
          </div>
        </template>

        <template #field-is247="{ value, update }">
          <div class="flex items-center justify-between mt-2">
            <div>
              <label class="text-sm font-medium">24/7 Channel</label>
              <p class="text-xs text-muted-foreground">
                Mark this channel as always live. It will disable notifications on #hctv-streams.
              </p>
            </div>
            <Switch :model-value="Boolean(value)" @update:model-value="(v: boolean) => update(v)" />
          </div>
        </template>
      </SettingsForm>

      <Separator />

      <div v-if="isPersonal && isOwner" class="space-y-4">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold">Username</h3>
        </div>
        <p class="text-sm text-muted-foreground">
          Your username is how others find and mention you on hctv. You can change it once every 30
          days.
        </p>
        <div
          v-if="!cooldownInfo.canChange"
          class="p-3 border border-accent/20 rounded-lg bg-accent/5"
        >
          <p class="text-sm text-accent">
            You can change your username again in {{ cooldownInfo.daysRemaining }} day{{
              cooldownInfo.daysRemaining === 1 ? '' : 's'
            }}.
          </p>
        </div>
        <SettingsForm
          :fields="usernameFields"
          action="changeUsername"
          submit-text="Change Username"
          @action-complete="handleUsernameChangeComplete"
        />
      </div>

      <template v-if="isOwner && !isPersonal">
        <Separator />
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-destructive">Danger Zone</h3>
          <div
            class="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5"
          >
            <div>
              <p class="font-medium text-destructive">Delete Channel</p>
              <p class="text-sm text-muted-foreground">
                Permanently delete this channel. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" @click="deleteChannel">
              <Trash2 class="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
