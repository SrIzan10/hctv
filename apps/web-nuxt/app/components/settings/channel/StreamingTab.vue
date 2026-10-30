<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Loader2, RotateCcw } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import CopyField from '~/components/settings/CopyField.vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import {
  getMediamtxClientEnvs,
  getMediamtxClientRegionOptions,
} from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

const confirm = useConfirm();
const serverOptions = getMediamtxClientRegionOptions();
const region = ref<MediaMTXRegion>('hq');
const ingestProtocol = ref<'srt' | 'rtmp'>('srt');

// useChannelStreamKey: seeded from the page data, revalidated on mount, POST regenerates
const streamKey = ref(props.channel.streamKey?.key ?? '');
const isRegeneratingStreamKey = ref(false);

onMounted(async () => {
  try {
    const res = await $fetch<{ key: string }>('/api/rtmp/streamKey', {
      query: { channel: props.channel.name },
    });
    streamKey.value = res.key;
  } catch {
    // keep the key from the page data
  }
});

async function handleRegenerateStreamKey() {
  const isConfirmed = await confirm({
    title: 'Reset stream key?',
    description:
      'Your current key stops working right away. You will need to paste the new one into OBS before streaming again.',
    confirmText: 'Reset key',
    cancelText: 'Cancel',
  });
  if (!isConfirmed) return;
  isRegeneratingStreamKey.value = true;
  try {
    const res = await $fetch<{ key: string }>('/api/rtmp/streamKey', {
      method: 'POST',
      body: { channel: props.channel.name },
    });
    streamKey.value = res.key;
    toast.success('Stream key reset');
  } catch {
    toast.error('Could not reset the stream key. Try again.');
  } finally {
    isRegeneratingStreamKey.value = false;
  }
}

const streamUrl = computed(() => {
  if (!streamKey.value) return '';
  const { ingestRoute } = getMediamtxClientEnvs(region.value);
  return `srt://${ingestRoute}?streamid=publish:${props.channel.name}:thisusernameislongonpurposesoyoudontaccidentallyleakyourstreamkey:${streamKey.value}&pkt_size=1316`;
});

const rtmpServerUrl = computed(() => `rtmp://${getMediamtxClientEnvs(region.value).rtmpRoute}`);

const rtmpStreamKey = computed(() => {
  if (!streamKey.value) return '';
  return `${props.channel.name}?user=thisusernameislongonpurposesoyoudontaccidentallyleakyourstreamkey&pass=${streamKey.value}`;
});

function streamInfoFields(
  stream: ChannelSettingsChannel['streamInfo'][number]
): SettingsFormField[] {
  return [
    { name: 'username', type: 'hidden', value: stream.username, label: 'Username' },
    { name: 'title', label: 'Title', type: 'text', value: stream.title },
    { name: 'category', label: 'Category', type: 'text', value: stream.category },
  ];
}

async function handleStreamInfoActionComplete(result: SettingsFormResult) {
  if (result?.success) {
    toast.success('Stream information updated');
    await refreshNuxtData();
  }
}
</script>

<template>
  <div>
    <SettingsSection
      title="Connect OBS"
      description="Pick a protocol and the server closest to you, then paste these into OBS under Settings, Stream."
    >
      <div class="grid gap-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="grid gap-2">
            <p class="text-sm font-medium">Protocol</p>
            <Select v-model="ingestProtocol">
              <SelectTrigger class="w-full" aria-label="Protocol">
                <SelectValue placeholder="Protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="rtmp">RTMP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <p class="text-sm font-medium">Server</p>
            <Select v-model="region">
              <SelectTrigger class="w-full" aria-label="Server">
                <SelectValue placeholder="Select a server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="server in serverOptions"
                  :key="server.value"
                  :value="server.value"
                >
                  {{ server.label }} {{ server.emoji }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CopyField
          v-if="ingestProtocol === 'srt'"
          label="Server URL"
          :value="streamUrl"
          secret
          copied-message="Server URL copied"
        />
        <template v-else>
          <CopyField label="Server" :value="rtmpServerUrl" copied-message="Server copied" />
          <CopyField
            label="Stream key"
            :value="rtmpStreamKey"
            secret
            copied-message="Stream key copied"
          />
        </template>

        <div class="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <p>
            For smooth playback, use H.264 at 720p30, 2,000 Kbps CBR, a 2-second keyframe interval,
            and AAC audio at 128 Kbps.
          </p>
          <p class="mt-2">
            New to this?
            <a
              href="https://docs.hackclub.tv/guides/start-stream/"
              class="font-medium text-link hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              >Read the streaming guide</a
            >.
          </p>
        </div>
      </div>
    </SettingsSection>

    <SettingsSection
      title="Stream key"
      description="Anyone with this key can stream to your channel. Reset it if it ever leaks."
    >
      <CopyField label="Stream key" :value="streamKey" secret copied-message="Stream key copied">
        <Button
          type="button"
          variant="outline"
          :disabled="isRegeneratingStreamKey"
          @click="handleRegenerateStreamKey"
        >
          <Loader2 v-if="isRegeneratingStreamKey" class="animate-spin" />
          <RotateCcw v-else />
          Reset
        </Button>
      </CopyField>
    </SettingsSection>

    <SettingsSection
      title="Stream details"
      description="Shown on your channel page and on stream cards while you're live."
    >
      <template v-if="channel.streamInfo.length > 0">
        <SettingsForm
          v-for="stream in channel.streamInfo"
          :key="stream.id"
          :fields="streamInfoFields(stream)"
          action="editStreamInfo"
          submit-text="Save details"
          @action-complete="handleStreamInfoActionComplete"
        />
      </template>
      <p v-else class="text-sm text-muted-foreground">This channel has no stream details yet.</p>
    </SettingsSection>
  </div>
</template>
