<script setup lang="ts">
import { ref } from 'vue';
import type { BotAccount } from '@hctv/db';
import { toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import PfpUpload from '~/components/settings/PfpUpload.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';

const props = defineProps<{ bot: Pick<BotAccount, 'id' | 'displayName' | 'slug' | 'pfpUrl'> & { description: string | null } }>();

const route = useRoute();
const isUploading = ref(false);
const uploadError = ref<string | null>(null);
const formRef = ref<InstanceType<typeof SettingsForm> | null>(null);

const fields: SettingsFormField[] = [
  { name: 'from', type: 'hidden', value: props.bot.id, required: true },
  {
    name: 'name',
    type: 'text',
    label: 'Bot Name',
    placeholder: 'Enter bot name',
    required: true,
    value: props.bot.displayName,
  },
  {
    name: 'slug',
    type: 'text',
    label: 'Bot Slug',
    placeholder: 'Enter bot slug',
    required: true,
    value: props.bot.slug,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Enter bot description',
    value: props.bot.description,
    textArea: true,
  },
  {
    name: 'pfpUrl',
    label: 'Profile Picture',
    type: 'url',
    value: props.bot.pfpUrl,
    custom: true,
  },
];

async function onActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    // Next did router.refresh(); a renamed slug would 403 the old URL, so follow it
    if (result.slug && result.slug !== route.params.slug) {
      await navigateTo(`/settings/bot/${result.slug}`, { replace: true });
    }
    await refreshNuxtData();
  }
}

function onUploaded(update: (v: unknown) => void, url: string) {
  isUploading.value = false;
  update(url);
  toast.success('Profile picture uploaded successfully!');
  setTimeout(() => {
    formRef.value?.submit();
  }, 0);
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>General Settings</CardTitle>
      <CardDescription>Edit your bot settings!</CardDescription>
    </CardHeader>
    <CardContent>
      <SettingsForm
        ref="formRef"
        :fields="fields"
        action="editBot"
        @action-complete="onActionComplete"
      >
        <template #field-pfpUrl="{ value, update }">
          <div class="space-y-4">
            <div v-if="value" class="flex items-center space-x-4">
              <Avatar class="h-16 w-16">
                <AvatarImage :src="String(value)" alt="Current profile picture" />
                <AvatarFallback>{{ props.bot.displayName[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div class="flex-1">
                <p class="text-sm font-medium">Current profile picture</p>
                <p class="text-xs text-muted-foreground">
                  Click "Upload new image" to replace
                </p>
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
                @uploaded="(url) => onUploaded(update, url)"
                @upload-error="
                  (message) => {
                    isUploading = false;
                    uploadError = message;
                  }
                "
              />

              <p v-if="isUploading" class="mt-2 text-sm text-primary">Uploading...</p>
              <p v-if="uploadError" class="mt-2 text-sm text-red-600">{{ uploadError }}</p>
              <p v-if="!value && !isUploading && !uploadError" class="mt-2 text-sm text-muted-foreground">
                Upload a profile picture for your channel.
              </p>
            </div>
          </div>
        </template>
      </SettingsForm>
    </CardContent>
  </Card>
</template>
