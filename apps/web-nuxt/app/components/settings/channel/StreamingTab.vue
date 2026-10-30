<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Check, Copy, Eye, EyeOff, Key, Loader2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormField, SettingsFormResult } from '~/components/settings/SettingsForm.vue';
import { getMediamtxClientEnvs, getMediamtxClientRegionOptions } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

type CopiedKey = 'streamKey' | 'streamUrl' | 'rtmpServer' | 'rtmpStreamKey';

const keyVisible = ref(false);
const copied = reactive<Record<CopiedKey, boolean>>({
  streamKey: false,
  streamUrl: false,
  rtmpServer: false,
  rtmpStreamKey: false,
});
const copiedTimers: ReturnType<typeof setTimeout>[] = [];
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

onBeforeUnmount(() => copiedTimers.forEach(clearTimeout));

async function copyValue(which: CopiedKey, value: string, message: string) {
  await navigator.clipboard.writeText(value);
  copied[which] = true;
  toast.success(message);
  copiedTimers.push(setTimeout(() => (copied[which] = false), 2000));
}

async function handleRegenerateStreamKey() {
  isRegeneratingStreamKey.value = true;
  try {
    const res = await $fetch<{ key: string }>('/api/rtmp/streamKey', {
      method: 'POST',
      body: { channel: props.channel.name },
    });
    streamKey.value = res.key;
    toast.success('Stream key regenerated successfully');
  } catch {
    toast.error('Failed to regenerate stream key');
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

function copyStreamKey() {
  if (streamKey.value) copyValue('streamKey', streamKey.value, 'Stream key copied to clipboard');
}

function copyStreamUrl() {
  if (!streamKey.value) {
    toast.error('Stream key not available');
    return;
  }
  copyValue('streamUrl', streamUrl.value, 'Stream URL copied to clipboard');
}

function copyRtmpServer() {
  copyValue('rtmpServer', rtmpServerUrl.value, 'Server URL copied to clipboard');
}

function copyRtmpStreamKey() {
  if (!streamKey.value) {
    toast.error('Stream key not available');
    return;
  }
  copyValue('rtmpStreamKey', rtmpStreamKey.value, 'Stream key copied to clipboard');
}

function streamInfoFields(stream: ChannelSettingsChannel['streamInfo'][number]): SettingsFormField[] {
  return [
    { name: 'username', type: 'hidden', value: stream.username, label: 'Username' },
    { name: 'title', label: 'Stream Title', type: 'text', value: stream.title },
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
  <Card>
    <CardHeader>
      <CardTitle>Streaming Settings</CardTitle>
      <CardDescription>Manage your stream key and streaming configuration.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div>
        <div class="space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-medium">Stream Key</label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <input
                  :type="keyVisible ? 'text' : 'password'"
                  :value="streamKey"
                  readonly
                  class="w-full px-3 py-2 pr-10 border rounded-md bg-mantle font-mono text-sm"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  @click="keyVisible = !keyVisible"
                >
                  <EyeOff v-if="keyVisible" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                :disabled="isRegeneratingStreamKey"
                @click="handleRegenerateStreamKey"
              >
                <Loader2 v-if="isRegeneratingStreamKey" class="h-4 w-4 animate-spin" />
                <Key v-else class="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" :disabled="!streamKey" @click="copyStreamKey">
                <Check v-if="copied.streamKey" class="h-4 w-4" />
                <Copy v-else class="h-4 w-4" />
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              For reliable playback, use H.264 at 720p30, 2,000 Kbps CBR, a 2-second keyframe
              interval, and AAC audio at 128 Kbps.
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium">
                {{ ingestProtocol === 'srt' ? 'Stream URL (for OBS)' : 'Stream Settings (for OBS)' }}
              </label>
              <div class="flex items-center gap-2">
                <Select v-model="ingestProtocol">
                  <SelectTrigger class="w-[100px] h-8">
                    <SelectValue placeholder="Protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="srt">SRT</SelectItem>
                    <SelectItem value="rtmp">RTMP</SelectItem>
                  </SelectContent>
                </Select>
                <Select v-model="region">
                  <SelectTrigger class="w-[180px] h-8">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="server in serverOptions" :key="server.value" :value="server.value">
                      {{ server.label }} {{ server.emoji }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div v-if="ingestProtocol === 'srt'" class="flex items-center gap-2">
              <div class="relative flex-1">
                <input
                  type="text"
                  :value="streamUrl"
                  readonly
                  class="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-xs"
                />
              </div>
              <Button variant="outline" size="icon-sm" :disabled="!streamKey" @click="copyStreamUrl">
                <Check v-if="copied.streamUrl" class="h-4 w-4" />
                <Copy v-else class="h-4 w-4" />
              </Button>
            </div>
            <div v-else class="space-y-2">
              <div>
                <p class="text-xs text-muted-foreground mb-1">Server</p>
                <div class="flex items-center gap-2">
                  <div class="relative flex-1">
                    <input
                      type="text"
                      :value="rtmpServerUrl"
                      readonly
                      class="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-xs"
                    />
                  </div>
                  <Button variant="outline" size="icon-sm" @click="copyRtmpServer">
                    <Check v-if="copied.rtmpServer" class="h-4 w-4" />
                    <Copy v-else class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-1">Stream Key</p>
                <div class="flex items-center gap-2">
                  <div class="relative flex-1">
                    <input
                      :type="keyVisible ? 'text' : 'password'"
                      :value="rtmpStreamKey"
                      readonly
                      class="w-full px-3 py-2 border rounded-md bg-mantle font-mono text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    :disabled="!streamKey"
                    @click="copyRtmpStreamKey"
                  >
                    <Check v-if="copied.rtmpStreamKey" class="h-4 w-4" />
                    <Copy v-else class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mt-2">
          Need help getting started? Check out our
          <a
            href="https://docs.hackclub.tv/guides/start-stream/"
            class="text-link hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            >streaming guide</a
          >.
        </p>
      </div>

      <Separator />

      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Stream Information</h3>
        <div v-if="channel.streamInfo.length > 0" class="space-y-4">
          <SettingsForm
            v-for="stream in channel.streamInfo"
            :key="stream.id"
            :fields="streamInfoFields(stream)"
            action="editStreamInfo"
            submit-text="Update Stream Info"
            @action-complete="handleStreamInfoActionComplete"
          />
        </div>
        <p v-else class="text-mantle-foreground">No stream information available.</p>
      </div>
    </CardContent>
  </Card>
</template>
