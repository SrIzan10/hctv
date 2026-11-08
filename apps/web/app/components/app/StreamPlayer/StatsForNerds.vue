<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { Copy, X } from '@lucide/vue';
import { toast } from 'vue-sonner';
import type Hls from 'hls.js';
import type { WhepReader } from '#shared/utils/mediamtx/whep';

// "stats for nerds": what the player is doing right now, refreshed every second.
// Values come straight from hls.js, the <video> element, or the WebRTC stats API.
const props = defineProps<{
  engine: 'hls' | 'webrtc' | null;
  video: HTMLVideoElement | null;
  hls: Hls | null;
  whep: WhepReader | null;
  server: string;
  channel: string;
}>();

const emit = defineEmits<{ close: [] }>();

type Row = { label: string; value: string };
const rows = ref<Row[]>([]);

// previous samples, for rates
let lastSampleAt = 0;
let lastTotalFrames = 0;
let lastBytesReceived = 0;

function kbps(bitsPerSecond: number) {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return '—';
  return bitsPerSecond >= 1_000_000
    ? `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`
    : `${Math.round(bitsPerSecond / 1000)} Kbps`;
}

function seconds(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(digits)} s`;
}

function bufferedAhead(video: HTMLVideoElement) {
  for (let i = 0; i < video.buffered.length; i += 1) {
    if (
      video.currentTime >= video.buffered.start(i) &&
      video.currentTime <= video.buffered.end(i)
    ) {
      return video.buffered.end(i) - video.currentTime;
    }
  }
  return 0;
}

function droppedFrames(video: HTMLVideoElement) {
  const quality = video.getVideoPlaybackQuality?.();
  if (!quality) return { value: '—', fps: 0 };
  const now = performance.now();
  const fps =
    lastSampleAt > 0
      ? ((quality.totalVideoFrames - lastTotalFrames) * 1000) / (now - lastSampleAt)
      : 0;
  lastTotalFrames = quality.totalVideoFrames;
  return {
    value: `${quality.droppedVideoFrames} / ${quality.totalVideoFrames}`,
    fps,
  };
}

function hlsRows(video: HTMLVideoElement, hls: Hls): Row[] {
  const level = hls.levels[hls.currentLevel] ?? hls.levels[0];
  const frames = droppedFrames(video);
  return [
    { label: 'Playback', value: 'HLS (low-latency)' },
    {
      label: 'Video',
      value: `${video.videoWidth}×${video.videoHeight}${frames.fps > 0 ? ` @ ${Math.round(frames.fps)} fps` : ''}`,
    },
    {
      label: 'Codecs',
      value: [level?.videoCodec, level?.audioCodec].filter(Boolean).join(', ') || '—',
    },
    { label: 'Bitrate', value: kbps(level?.bitrate ?? 0) },
    { label: 'Bandwidth', value: kbps(hls.bandwidthEstimate) },
    {
      label: 'Latency',
      value: `${seconds(hls.latency)} (target ${seconds(hls.targetLatency, 1)})`,
    },
    { label: 'Buffer', value: seconds(bufferedAhead(video)) },
    { label: 'Speed', value: `${video.playbackRate.toFixed(2)}×` },
    { label: 'Dropped', value: frames.value },
  ];
}

async function webrtcRows(video: HTMLVideoElement, whep: WhepReader): Promise<Row[]> {
  const report = await whep.getStats();
  if (!report) return [{ label: 'Playback', value: 'WebRTC (connecting…)' }];

  let videoIn: any;
  let audioIn: any;
  let pair: any;
  const codecs = new Map<string, string>();
  const candidates = new Map<string, any>();
  let bytesReceived = 0;

  report.forEach((stat: any) => {
    if (stat.type === 'inbound-rtp') {
      bytesReceived += stat.bytesReceived ?? 0;
      if (stat.kind === 'video') videoIn = stat;
      if (stat.kind === 'audio') audioIn = stat;
    } else if (stat.type === 'codec') {
      codecs.set(stat.id, stat.mimeType?.split('/')[1] ?? stat.mimeType);
    } else if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded') {
      pair = stat;
    } else if (stat.type === 'local-candidate') {
      candidates.set(stat.id, stat);
    }
  });

  const now = performance.now();
  const bitrate =
    lastSampleAt > 0 ? ((bytesReceived - lastBytesReceived) * 8 * 1000) / (now - lastSampleAt) : 0;
  lastBytesReceived = bytesReceived;
  const frames = droppedFrames(video);

  const jitterBuffer =
    videoIn?.jitterBufferEmittedCount > 0
      ? videoIn.jitterBufferDelay / videoIn.jitterBufferEmittedCount
      : null;
  const rtt = pair?.currentRoundTripTime;
  const lost = (videoIn?.packetsLost ?? 0) + (audioIn?.packetsLost ?? 0);
  const received = (videoIn?.packetsReceived ?? 0) + (audioIn?.packetsReceived ?? 0);
  const local = pair ? candidates.get(pair.localCandidateId) : null;

  return [
    { label: 'Playback', value: 'WebRTC (real-time)' },
    {
      label: 'Video',
      value: videoIn?.frameWidth
        ? `${videoIn.frameWidth}×${videoIn.frameHeight} @ ${Math.round(videoIn.framesPerSecond ?? frames.fps)} fps`
        : `${video.videoWidth}×${video.videoHeight}`,
    },
    {
      label: 'Codecs',
      value:
        [codecs.get(videoIn?.codecId), codecs.get(audioIn?.codecId)].filter(Boolean).join(', ') ||
        '—',
    },
    { label: 'Bitrate', value: kbps(bitrate) },
    {
      label: 'Latency',
      value: `${jitterBuffer === null ? '—' : `${Math.round(jitterBuffer * 1000)} ms buffer`}${
        rtt !== undefined ? ` + ${Math.round(rtt * 1000)} ms RTT` : ''
      }`,
    },
    {
      label: 'Packet loss',
      value: received > 0 ? `${lost} (${((lost / (lost + received)) * 100).toFixed(2)}%)` : '—',
    },
    {
      label: 'Jitter',
      value: audioIn?.jitter !== undefined ? `${Math.round(audioIn.jitter * 1000)} ms` : '—',
    },
    {
      label: 'Connection',
      value: local ? `${local.candidateType} / ${local.protocol}` : '—',
    },
    {
      label: 'Dropped',
      value: videoIn?.framesDropped !== undefined ? String(videoIn.framesDropped) : frames.value,
    },
  ];
}

async function sample() {
  const video = props.video;
  let next: Row[];

  if (!video || !props.engine) {
    next = [{ label: 'Playback', value: 'Not playing' }];
  } else if (props.engine === 'webrtc' && props.whep) {
    next = await webrtcRows(video, props.whep);
  } else if (props.engine === 'hls' && props.hls) {
    next = hlsRows(video, props.hls);
  } else {
    // native HLS (Safari) exposes only what the <video> element knows
    const frames = droppedFrames(video);
    next = [
      { label: 'Playback', value: 'HLS (native)' },
      { label: 'Video', value: `${video.videoWidth}×${video.videoHeight}` },
      { label: 'Buffer', value: seconds(bufferedAhead(video)) },
      { label: 'Dropped', value: frames.value },
    ];
  }

  lastSampleAt = performance.now();
  rows.value = [{ label: 'Channel', value: `${props.channel} · ${props.server}` }, ...next];
}

void sample();
const { pause } = useIntervalFn(() => void sample(), 1000);
onBeforeUnmount(pause);

async function copy() {
  const text = rows.value.map((row) => `${row.label}: ${row.value}`).join('\n');
  try {
    await navigator.clipboard.writeText(`${text}\nUser agent: ${navigator.userAgent}`);
    toast.success('Stats copied');
  } catch {
    toast.error("Couldn't copy the stats");
  }
}
</script>

<template>
  <div
    class="absolute left-3 top-3 z-10 w-[min(22rem,calc(100%-1.5rem))] rounded-xl bg-black/80 p-3 font-mono text-[12px] leading-relaxed text-white/90 backdrop-blur-sm"
    role="dialog"
    aria-label="Stats for nerds"
    @click.stop
  >
    <div class="mb-1.5 flex items-center justify-between font-sans">
      <p class="text-[13px] font-bold text-white">Stats for nerds</p>
      <div class="flex items-center">
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Copy stats"
          @click="copy"
        >
          <Copy class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Close stats"
          @click="emit('close')"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>
    <dl class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
      <template v-for="row in rows" :key="row.label">
        <dt class="text-white/55">{{ row.label }}</dt>
        <dd class="truncate tabular-nums" :title="row.value">{{ row.value }}</dd>
      </template>
    </dl>
  </div>
</template>
