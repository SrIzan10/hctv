<script setup lang="ts">
import { ref } from 'vue';
import { Plus, RefreshCcw, Trash } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';

const props = defineProps<{ slug: string }>();

type GetResponse = {
  success: boolean;
  apiKeys: Array<{ id: string; name: string; createdAt: string }>;
};

type PostRequest = {
  action: 'revoke' | 'regenerate' | 'create';
  name: string;
};

type PostResponse = {
  success: boolean;
  apiKey?: string;
  id?: string;
  error?: string;
};

const confirm = useConfirm();
const newApiKeyName = ref('');
const url = `/api/settings/bot/${props.slug}/apiKey`;

const {
  data,
  error,
  status,
  refresh: mutate,
} = useFetch<GetResponse>(url, { key: `bot-api-keys-${props.slug}`, server: false, lazy: true });
const isLoading = computed(() => status.value === 'pending' && !data.value);

async function trigger(body: PostRequest): Promise<PostResponse> {
  // the endpoint answers 4xx with a `{ success: false, error }` body that the UI shows
  return $fetch<PostResponse>(url, { method: 'POST', body, ignoreResponseError: true });
}

async function copyKey(apiKey: string | undefined) {
  try {
    await navigator.clipboard.writeText(apiKey || '');
    toast.success('API key copied to clipboard');
  } catch {
    alert('Failed to copy API key to clipboard, here it is: ' + apiKey);
  }
}

async function apiKeyCreate() {
  if (newApiKeyName.value.trim().length < 3) {
    toast.error('API Key name must be at least 3 characters long');
    return;
  }
  if (newApiKeyName.value.trim().length > 50) {
    toast.error('API Key name must be at most 50 characters long');
    return;
  }
  const res = await trigger({ action: 'create', name: newApiKeyName.value });
  if (res.success) {
    newApiKeyName.value = '';
    await copyKey(res.apiKey);
    await mutate();
  } else {
    toast.error(res.error || 'Error creating API key');
  }
}

async function regenerate(name: string) {
  const confirmation = await confirm({
    title: 'Regenerate API Key',
    description:
      'Are you sure you want to regenerate this API key? The old key will stop working.',
    confirmText: 'Regenerate',
    cancelText: 'Cancel',
  });
  if (!confirmation) return;

  const res = await trigger({ action: 'regenerate', name });
  if (res.success) {
    await copyKey(res.apiKey);
    await mutate();
  } else {
    toast.error(res.error || 'Error regenerating API key');
  }
}

async function revoke(name: string) {
  const confirmation = await confirm({
    title: 'Revoke API Key',
    description: 'Are you sure you want to revoke this API key? This action cannot be undone.',
    confirmText: 'Revoke',
    cancelText: 'Cancel',
  });
  if (!confirmation) return;

  const res = await trigger({ action: 'revoke', name });
  if (res.success) {
    await mutate();
  } else {
    toast.error(res.error || 'Error revoking API key');
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>API Keys</CardTitle>
      <CardDescription>Manage your API keys</CardDescription>
    </CardHeader>
    <CardContent>
      <template v-if="isLoading">
        <div class="flex">
          <Skeleton class="h-10 flex-1 mr-2" />
          <Skeleton class="h-10 w-10" />
        </div>
        <div class="space-y-2 pt-4">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center justify-between p-3 bg-mantle/50 rounded-md"
          >
            <div class="flex-1">
              <Skeleton class="h-4 w-1/2" />
            </div>
            <div class="flex items-center space-x-2">
              <Skeleton class="h-8 w-8" />
              <Skeleton class="h-8 w-8" />
            </div>
          </div>
        </div>
      </template>
      <p v-if="error">Error loading API keys</p>
      <p v-if="data && !data.success">Error: Could not fetch API keys</p>
      <div v-if="data" class="flex">
        <Input
          v-model="newApiKeyName"
          placeholder="New API Key Name"
          class="flex-1 mr-2"
          @keydown.enter="apiKeyCreate"
        />
        <Button size="icon" @click="apiKeyCreate">
          <Plus />
        </Button>
      </div>
      <p v-if="data && data.success && data.apiKeys.length === 0">No API keys found</p>
      <ul v-if="data && data.success && data.apiKeys.length > 0" class="space-y-2 pt-4">
        <li
          v-for="key in data.apiKeys"
          :key="key.id"
          class="flex items-center justify-between p-3 bg-mantle/50 rounded-md"
        >
          <div class="flex-1">
            <strong class="text-sm font-medium">{{ key.name }}</strong>
          </div>
          <div class="flex items-center space-x-2">
            <Button variant="outline" size="sm" @click="regenerate(key.name)">
              <RefreshCcw class="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" @click="revoke(key.name)">
              <Trash class="h-4 w-4" />
            </Button>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
