<script setup lang="ts">
import { computed, ref } from 'vue';
import { Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Preview from '~/components/ui/channel-desc-fancy-area/Preview.vue';
import Write from '~/components/ui/channel-desc-fancy-area/Write.vue';
import PfpUpload from '~/components/settings/PfpUpload.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
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
    label: 'Picture',
    type: 'url',
    value: props.channel.pfpUrl,
    custom: true,
  },
  {
    name: 'description',
    label: 'Description',
    value: props.channel.description,
    custom: true,
  },
  { name: 'is247', value: props.channel.is247, custom: true },
];

const usernameFields: SettingsFormField[] = [
  { name: 'channelId', type: 'hidden', value: props.channel.id, label: 'Channel ID' },
  {
    name: 'newUsername',
    label: 'New username',
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
      description: 'Are you sure you want to delete this channel? This action cannot be undone.',
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
  <div>
    <SettingsSection
      title="Profile"
      description="How your channel appears on its page and around hctv."
    >
      <SettingsForm
        ref="settingsFormRef"
        :fields="settingsFields"
        action="updateChannelSettings"
        submit-text="Save profile"
        @action-complete="handleChannelSettingsActionComplete"
      >
        <template #field-pfpUrl="{ value, update }">
          <div class="flex flex-wrap items-center gap-4">
            <Avatar class="h-16 w-16">
              <AvatarImage v-if="value" :src="String(value)" alt="Current profile picture" />
              <AvatarFallback class="text-lg">{{ channel.name[0]?.toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="flex flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <PfpUpload
                  :has-value="Boolean(value)"
                  hide-hint
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
                <Button
                  v-if="value"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-muted-foreground"
                  @click="
                    update('');
                    uploadError = null;
                  "
                >
                  Remove
                </Button>
              </div>
              <p v-if="isUploading" class="text-xs text-muted-foreground">Uploading...</p>
              <p v-else-if="uploadError" class="text-xs text-destructive">{{ uploadError }}</p>
              <p v-else class="text-xs text-muted-foreground">Any image up to 1 MB.</p>
            </div>
          </div>
        </template>

        <template #field-description="{ value, update }">
          <Tabs default-value="write" class="w-full gap-3">
            <TabsList class="h-9">
              <TabsTrigger value="write" class="flex-none">Write</TabsTrigger>
              <TabsTrigger value="preview" class="flex-none">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Write :text-value="String(value || '')" @set-text-value="(v: string) => update(v)" />
            </TabsContent>
            <TabsContent value="preview">
              <Preview
                :text-value="String(value || '')"
                class="min-h-[159.5px] rounded-lg border bg-card px-3 py-2 text-sm"
              />
            </TabsContent>
          </Tabs>
        </template>

        <template #field-is247="{ value, update }">
          <label
            class="flex cursor-pointer items-start justify-between gap-6 rounded-xl border bg-card p-4"
          >
            <span>
              <span class="block text-sm font-bold">Always on (24/7)</span>
              <span class="mt-0.5 block text-sm text-muted-foreground">
                List this channel under Always on. Go-live posts in #hctv-streams are turned off.
              </span>
            </span>
            <Switch
              class="mt-0.5"
              :model-value="Boolean(value)"
              @update:model-value="(v: boolean) => update(v)"
            />
          </label>
        </template>
      </SettingsForm>
    </SettingsSection>

    <SettingsSection
      v-if="isPersonal && isOwner"
      title="Username"
      description="How people find and mention you. You can change it once every 30 days."
    >
      <p
        v-if="!cooldownInfo.canChange"
        class="mb-4 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground"
      >
        You can change your username again in {{ cooldownInfo.daysRemaining }} day{{
          cooldownInfo.daysRemaining === 1 ? '' : 's'
        }}.
      </p>
      <SettingsForm
        :fields="usernameFields"
        action="changeUsername"
        submit-text="Change username"
        @action-complete="handleUsernameChangeComplete"
      />
    </SettingsSection>

    <SettingsSection
      v-if="isOwner && !isPersonal"
      title="Delete channel"
      description="Permanently removes this channel. This can't be undone."
      tone="danger"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/30 p-4"
      >
        <p class="text-sm">
          Delete <span class="font-bold">{{ channel.name }}</span> permanently.
        </p>
        <Button variant="destructive" size="sm" @click="deleteChannel">
          <Trash2 />
          Delete channel
        </Button>
      </div>
    </SettingsSection>
  </div>
</template>
