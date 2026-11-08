<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Loader2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { callAction } from '~/lib/actions';
import {
  MULTISTREAM_PLATFORMS,
  MULTISTREAM_PLATFORM_META,
  isMultistreamPlatform,
} from '#shared/utils/multistream';
import type { MultistreamPlatform } from '#shared/utils/multistream';
import type { MultistreamDestinationView } from './types';

const props = defineProps<{
  channelId: string;
  // set when editing; adding otherwise
  destination?: MultistreamDestinationView | null;
}>();

const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });

const platform = ref<MultistreamPlatform>('youtube');
const name = ref('');
const serverUrl = ref('');
const streamKey = ref('');
const isSaving = ref(false);

const isEditing = computed(() => !!props.destination);
const meta = computed(() => MULTISTREAM_PLATFORM_META[platform.value]);

watch(open, (isOpen) => {
  if (!isOpen) return;
  const destination = props.destination;
  platform.value =
    destination && isMultistreamPlatform(destination.platform) ? destination.platform : 'youtube';
  name.value = destination?.name ?? MULTISTREAM_PLATFORM_META[platform.value].label;
  serverUrl.value =
    destination?.serverUrl ?? MULTISTREAM_PLATFORM_META[platform.value].defaultServer;
  streamKey.value = '';
});

function onPlatformChange(value: unknown) {
  if (typeof value !== 'string' || !isMultistreamPlatform(value)) return;
  const previous = MULTISTREAM_PLATFORM_META[platform.value];
  platform.value = value;
  // only replace what still holds the previous platform's defaults
  if (!name.value || name.value === previous.label) {
    name.value = MULTISTREAM_PLATFORM_META[value].label;
  }
  if (!serverUrl.value || serverUrl.value === previous.defaultServer) {
    serverUrl.value = MULTISTREAM_PLATFORM_META[value].defaultServer;
  }
}

async function save() {
  isSaving.value = true;
  try {
    const res = props.destination
      ? await callAction('updateMultistreamDestination', {
          id: props.destination.id,
          name: name.value,
          serverUrl: serverUrl.value,
          streamKey: streamKey.value,
        })
      : await callAction('addMultistreamDestination', {
          channelId: props.channelId,
          platform: platform.value,
          name: name.value,
          serverUrl: serverUrl.value,
          streamKey: streamKey.value,
        });

    if (!res.success) {
      toast.error(res.error ?? 'Could not save the destination');
      return;
    }

    toast.success(isEditing.value ? 'Destination updated' : 'Destination added');
    open.value = false;
    emit('saved');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit destination' : 'Add destination' }}</DialogTitle>
        <DialogDescription>
          While you're live, hctv sends your stream here too. You only stream once from OBS.
        </DialogDescription>
      </DialogHeader>

      <!-- not a login form: keep password managers from autofilling the name or key -->
      <form
        class="grid gap-4"
        autocomplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        @submit.prevent="save"
      >
        <div class="grid gap-2">
          <Label for="multistream-platform">Platform</Label>
          <Select
            :model-value="platform"
            :disabled="isEditing"
            @update:model-value="onPlatformChange"
          >
            <SelectTrigger id="multistream-platform" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in MULTISTREAM_PLATFORMS" :key="p" :value="p">
                {{ MULTISTREAM_PLATFORM_META[p].label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid gap-2">
          <Label for="multistream-name">Name</Label>
          <Input
            id="multistream-name"
            v-model="name"
            maxlength="50"
            required
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
          />
        </div>

        <div class="grid gap-2">
          <Label for="multistream-server">Server URL</Label>
          <Input
            id="multistream-server"
            v-model="serverUrl"
            placeholder="rtmps://..."
            required
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
          />
          <p class="text-[13px] text-muted-foreground">{{ meta.serverHint }}</p>
        </div>

        <div class="grid gap-2">
          <Label for="multistream-key">Stream key</Label>
          <Input
            id="multistream-key"
            v-model="streamKey"
            type="password"
            autocomplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
            :placeholder="
              isEditing
                ? `Leave empty to keep ${destination?.maskedKey || 'no key'}`
                : meta.isKeyRequired
                  ? ''
                  : 'Optional'
            "
            :required="!isEditing && meta.isKeyRequired"
          />
          <p class="text-[13px] text-muted-foreground">{{ meta.keyHint }}</p>
        </div>

        <DialogFooter>
          <Button type="submit" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="animate-spin" />
            {{ isEditing ? 'Save' : 'Add destination' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
