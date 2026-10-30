<script setup lang="ts">
import Hls from 'hls.js';
import type { HlsConfig, ErrorData } from 'hls.js';
import { Loader2, Maximize, Minimize, Pause, Play, RefreshCw, Volume2, VolumeX } from '@lucide/vue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { getMediamtxClientEnvs } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';

const FATAL_RECOVERY_COOLDOWN_MS = 5000;
const PLAYBACK_HEARTBEAT_MS = 30_000;
const CATCH_UP_ARM_DELAY_MS = 8000;
const CATCH_UP_PLAYBACK_RATE = 1.15;
// how far short of the buffer end a foreground re-sync can land. seeking to the exact end
// leaves nothing to decode and just stalls again, so we leave a little room.
const RESYNC_BUFFER_MARGIN_SECONDS = 0.5;

// the important thing to know here: hlsSegmentDuration in docker/mediamtx/mediamtx.yml says 1s,
// but that is only a target. mediamtx remuxes rather than transcodes, so it can only cut a segment
// on a keyframe, and real segment length is whatever gop the streamer sends. measured live off an
// actual playlist: EXT-X-TARGETDURATION is 10, and EXTINF values alternate 10s and 5s. so segments
// here are 5-10 seconds, not 1.
//
// that is why ll-hls has to stay on. with lowLatencyMode off the player can only start on a
// complete segment, and the blocking playlist reload sits open until that whole 5-10s segment is
// finished: measured playlist responses of p50 1955ms and p90 5033ms, which viewers saw as 4+
// second freezes. parts are the only thing giving these streams granularity finer than the gop.
//
// parts are now 1s (hlsPartDuration in the mediamtx configs, raised from 200ms). hls.js loads media
// serially per track, so its ceiling is one part per request, and a request through the edge costs
// ~385ms p50 / ~576ms p90 because each part url is unique and with few viewers it is always a cache
// MISS that goes to the origin. at 200ms parts that meant ingesting 200ms of media per ~385ms of
// wall clock, so the playhead could never hold position at the edge no matter what target we set,
// which is why 1.4, 2 and 3.5 all failed in turn. at 1s the same request rate is ~2.6x real time.
//
// TARGET_LATENCY_SECONDS has to clear PART-HOLD-BACK, which the spec floors at 3 part durations, so
// 3s with 1s parts. 4 sits just above that floor.
//
// MAX_LATENCY_SECONDS has to stay above EXT-X-TARGETDURATION. hls.js force-seeks whenever latency
// passes it, and with 10s segments latency naturally swings by a full segment, so the old value of
// 6 was below one segment and made it force-seek constantly: 23 seeks in 56s, alongside a median
// forward buffer of 0.32s. 20 leaves room for a segment plus the request round trips.
//
// getting the target lower than this is an infra fix rather than a player setting: argo smart
// routing, a closer origin, or enough concurrent viewers that edge caching starts hitting. asking
// streamers for a shorter keyframe interval (1-2s) would also help every part of this.
const USE_LOW_LATENCY_HLS = true;
const TARGET_LATENCY_SECONDS = 4;
const MAX_LATENCY_SECONDS = 20;

const isDev = import.meta.dev;
const route = useRoute();
const resolvedUsername = computed(() => {
  const param = route.params.username;
  return (Array.isArray(param) ? param[0] : param) ?? '';
});
const { stream: userInfo } = useStreamLive(resolvedUsername);
const { data: sessionData } = useFetch<{ sessionId: string | null }>('/api/pages/session', {
  key: 'player-session',
  server: false,
  lazy: true,
});

const region = computed(() => userInfo.value?.streamRegion as MediaMTXRegion | undefined);
const isLive = computed(() => Boolean(userInfo.value?.isLive));
const sessionId = computed(() => sessionData.value?.sessionId ?? null);

const streamSrc = computed(() => {
  if (!resolvedUsername.value || !userInfo.value?.isLive || !region.value) {
    return null;
  }
  return `${getMediamtxClientEnvs(region.value).publicUrl}/${resolvedUsername.value}/index.m3u8`;
});

const containerRef = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const hlsRef = shallowRef<Hls | null>(null);

const isPaused = ref(true);
const isMuted = ref(false);
const volume = ref(1);
const isBuffering = ref(false);
const isFullscreen = ref(false);
const isRecovering = ref(false);
const canFullscreen = ref(true);

let lastRecoveryAt = 0;
let playbackStartedAt = 0;
let hasReportedPlaying = false;
let lastRenditionCount = 0;
let lastActiveRenditionKey: string | undefined;
let lastDroppedFrames = 0;
let lastStallAt = 0;
let catchUpArmTimeout: ReturnType<typeof setTimeout> | null = null;
let recoveringTimeout: ReturnType<typeof setTimeout> | null = null;

function reportPlayback(event: PlaybackMetricEvent, values: PlaybackMetricValues = {}) {
  if (!region.value) {
    return;
  }

  void fetch('/api/metrics/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, region: region.value, ...values }),
    keepalive: true,
  }).catch(() => {
    // metrics reporting should never break playback.
  });
}

function getBufferedAhead(video: HTMLVideoElement): number {
  for (let index = 0; index < video.buffered.length; index += 1) {
    if (
      video.currentTime >= video.buffered.start(index) &&
      video.currentTime <= video.buffered.end(index)
    ) {
      return Math.max(0, video.buffered.end(index) - video.currentTime);
    }
  }

  return 0;
}

function disarmCatchUp() {
  if (catchUpArmTimeout) {
    clearTimeout(catchUpArmTimeout);
    catchUpArmTimeout = null;
  }

  if (hlsRef.value) {
    hlsRef.value.config.maxLiveSyncPlaybackRate = 1;
  }
}

function buildHlsConfig(id: string): Partial<HlsConfig> {
  const credentials = btoa(`skibiditoilet:${id}`);

  return {
    xhrSetup: (xhr: XMLHttpRequest) => {
      xhr.withCredentials = true;
      xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
    },
    lowLatencyMode: USE_LOW_LATENCY_HLS,
    enableWorker: true,

    // setting liveSyncDuration makes hls.js target this instead of the playlist's own
    // part-hold-back of 0.5s, which is far too tight when a single request costs ~385ms.
    // liveSyncOnStallIncrease gives viewers who keep stalling more room on top of this, and
    // its cap is one target duration, which is 10s here rather than the 1s the mediamtx
    // config implies.
    liveSyncDuration: TARGET_LATENCY_SECONDS,
    liveMaxLatencyDuration: MAX_LATENCY_SECONDS,
    liveSyncOnStallIncrease: 1,
    maxLiveSyncPlaybackRate: 1,
    // re-sync inside what's already buffered instead of jumping to the edge and
    // re-buffering from nothing.
    liveSyncMode: 'buffered',

    // buffer caps. at the live edge the forward buffer is bounded by the edge itself, so
    // these mostly control memory and how far back a viewer can catch up from, not latency.
    backBufferLength: 30,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1000 * 1000,

    // start playing off the first playlist instead of waiting for a bandwidth probe.
    initialLiveManifestSize: 1,
    startFragPrefetch: true,
    startLevel: 0,
    testBandwidth: false,

    // how long we wait for a part's first byte. a timeout is worse than a slow success here,
    // because the retry re-requests media we're about to need and the playhead can run out of
    // buffer while it waits. measured p90 is ~576ms with a ~1s tail, so 8s is far beyond
    // anything healthy. stay generous and let liveMaxLatencyDuration be the real limit.
    fragLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: 8_000,
        maxLoadTimeMs: 30_000,
        timeoutRetry: {
          maxNumRetry: 4,
          retryDelayMs: 500,
          maxRetryDelayMs: 4000,
          backoff: 'exponential',
        },
        errorRetry: {
          maxNumRetry: 6,
          retryDelayMs: 1000,
          maxRetryDelayMs: 8000,
          backoff: 'exponential',
        },
      },
    },
    debug: import.meta.dev,
  } as Partial<HlsConfig>;
}

function destroyEngine() {
  disarmCatchUp();
  if (hlsRef.value) {
    hlsRef.value.destroy();
    hlsRef.value = null;
  }
}

function startPlayback() {
  const video = videoRef.value;
  const src = streamSrc.value;
  destroyEngine();
  if (!video) {
    return;
  }
  if (!src || !sessionId.value) {
    video.removeAttribute('src');
    video.load();
    isBuffering.value = false;
    return;
  }

  playbackStartedAt = performance.now();
  hasReportedPlaying = false;
  lastRenditionCount = 0;
  lastActiveRenditionKey = undefined;
  lastDroppedFrames = 0;
  isBuffering.value = true;
  reportPlayback('load');

  if (Hls.isSupported()) {
    const hls = new Hls(buildHlsConfig(sessionId.value));
    hlsRef.value = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      const renditionCount = data.levels.length;
      if (renditionCount && renditionCount !== lastRenditionCount) {
        lastRenditionCount = renditionCount;
        reportPlayback('manifest', { levelCount: renditionCount });
      }
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const active = hls.levels[data.level];
      if (!active) {
        return;
      }
      const activeKey = `${active.bitrate ?? ''}x${active.height ?? ''}`;
      if (activeKey !== lastActiveRenditionKey) {
        lastActiveRenditionKey = activeKey;
        reportPlayback('level', {
          bitrateKbps: active.bitrate ? active.bitrate / 1000 : undefined,
          height: active.height,
        });
      }
    });

    hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
      if (!data.fatal) {
        return;
      }
      reportPlayback('error', { errorType: String(data.type).slice(0, 64), fatal: true });
      triggerRecovery('fatal');
    });

    hls.attachMedia(video);
    hls.loadSource(src);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // native HLS (Safari/iOS). no custom headers, but the session cookie is still sent.
    video.src = src;
  }

  void video.play().catch(() => {
    // autoplay can get rejected, that's fine, the controls are still there for manual playback.
  });
}

function triggerRecovery(reason: 'fatal' | 'manual') {
  const now = Date.now();
  if (reason === 'fatal' && now - lastRecoveryAt < FATAL_RECOVERY_COOLDOWN_MS) {
    return;
  }

  lastRecoveryAt = now;
  isRecovering.value = true;
  if (recoveringTimeout) {
    clearTimeout(recoveringTimeout);
  }
  recoveringTimeout = setTimeout(() => {
    isRecovering.value = false;
  }, 1200);
  reportPlayback('recovery', { recoveryReason: reason });
  startPlayback();
}

function handleWaiting() {
  isBuffering.value = true;
  const now = Date.now();
  if (now - lastStallAt < 1000 || !videoRef.value) {
    return;
  }
  lastStallAt = now;
  // we sample latency here too, not just on the heartbeat, since the heartbeat's 30s cadence
  // never lines up with a stall. without this we can't tell if the playhead starved because
  // it was too close to the edge or because a load was just slow.
  reportPlayback('stall', {
    bufferedSeconds: getBufferedAhead(videoRef.value),
    latencySeconds: hlsRef.value?.latency || undefined,
  });
}

function handlePlaying() {
  isBuffering.value = false;
  isRecovering.value = false;
  if (!hasReportedPlaying) {
    hasReportedPlaying = true;
    reportPlayback('playing', {
      startupSeconds: (performance.now() - playbackStartedAt) / 1000,
    });

    catchUpArmTimeout = setTimeout(() => {
      if (hlsRef.value) {
        hlsRef.value.config.maxLiveSyncPlaybackRate = CATCH_UP_PLAYBACK_RATE;
      }
    }, CATCH_UP_ARM_DELAY_MS);
  }
}

function handleVolumeChange() {
  const video = videoRef.value;
  if (!video) {
    return;
  }
  isMuted.value = video.muted;
  volume.value = video.volume;
}

function handleVisibilityChange() {
  const video = videoRef.value;
  const engine = hlsRef.value;
  if (document.visibilityState !== 'visible' || !video || !engine) {
    return;
  }

  const details = engine.latestLevelDetails;
  const targetLatency = engine.targetLatency;
  const syncPosition = engine.liveSyncPosition;
  if (!details?.live || targetLatency === null || syncPosition === null) {
    return;
  }

  // backgrounded tabs get throttled and drift behind the edge, but hls.js only force-seeks
  // once latency passes liveMaxLatencyDuration. anything between the target and that ceiling
  // gets left to the catch-up playback rate, which can take tens of seconds to claw back what
  // a background pause adds. we seek on the way back instead so it's instant.
  if (engine.latency <= targetLatency + details.targetduration) {
    return;
  }

  // stay inside what's already buffered here too, same idea as liveSyncMode: 'buffered'
  // above. a throttled tab can leave the buffer ending well short of the sync position, and
  // seeking past it just trades a gradual catch-up for an immediate re-buffer, which is the
  // spinner we're trying to avoid. landing just inside the buffer end recovers what we can
  // for free and leaves the rest to the catch-up rate.
  const bufferedEnd = video.currentTime + getBufferedAhead(video);
  const seekTarget = Math.min(syncPosition, bufferedEnd - RESYNC_BUFFER_MARGIN_SECONDS);
  if (seekTarget <= video.currentTime) {
    return;
  }

  reportPlayback('resync', { latencySeconds: engine.latency });
  video.currentTime = seekTarget;
}

function handleVideoError() {
  // native-playback failures (hls.js reports its own through the ERROR event)
  if (hlsRef.value || !videoRef.value?.error) {
    return;
  }
  reportPlayback('error', { errorType: String(videoRef.value.error.code), fatal: true });
  triggerRecovery('fatal');
}

function togglePlay() {
  const video = videoRef.value;
  if (!video) {
    return;
  }
  if (video.paused) {
    void video.play().catch(() => {});
  } else {
    video.pause();
  }
}

function toggleMute() {
  const video = videoRef.value;
  if (!video) {
    return;
  }
  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) {
    video.volume = 0.5;
  }
}

function toggleFullscreen() {
  const container = containerRef.value;
  if (!container) {
    return;
  }
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  } else {
    void container.requestFullscreen().catch(() => {});
  }
}

function setVolumeFromPointer(event: PointerEvent) {
  const video = videoRef.value;
  const track = event.currentTarget as HTMLElement | null;
  if (!video || !track) {
    return;
  }
  const rect = track.getBoundingClientRect();
  // the root has 1rem of left padding, the track is the inner part
  const inner = track.querySelector('[data-volume-track]') as HTMLElement | null;
  const bounds = inner ? inner.getBoundingClientRect() : rect;
  const next = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  video.volume = next;
  video.muted = next === 0;
}

function onVolumePointerDown(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  setVolumeFromPointer(event);
}

function onVolumePointerMove(event: PointerEvent) {
  if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
    setVolumeFromPointer(event);
  }
}

const volumeFill = computed(() => `${(isMuted.value ? 0 : volume.value) * 100}%`);

let heartbeat: ReturnType<typeof setInterval> | null = null;
const onFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === containerRef.value;
};

onMounted(() => {
  canFullscreen.value = Boolean(document.fullscreenEnabled);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('fullscreenchange', onFullscreenChange);

  heartbeat = setInterval(() => {
    const video = videoRef.value;
    if (!video || !hlsRef.value) {
      return;
    }
    const droppedFrames = video.getVideoPlaybackQuality?.().droppedVideoFrames ?? 0;
    reportPlayback('heartbeat', {
      bandwidthKbps: hlsRef.value.bandwidthEstimate / 1000,
      bufferedSeconds: getBufferedAhead(video),
      droppedFrames: Math.max(0, droppedFrames - lastDroppedFrames),
      latencySeconds: hlsRef.value.latency || undefined,
      fatal: false,
    });
    lastDroppedFrames = droppedFrames;
  }, PLAYBACK_HEARTBEAT_MS);
});

watch(
  [streamSrc, sessionId, videoRef],
  () => {
    if (import.meta.client && videoRef.value) {
      startPlayback();
    }
  },
  { flush: 'post' }
);

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (heartbeat) {
    clearInterval(heartbeat);
  }
  if (recoveringTimeout) {
    clearTimeout(recoveringTimeout);
  }
  destroyEngine();
});

type PlaybackMetricEvent =
  | 'error'
  | 'heartbeat'
  | 'level'
  | 'load'
  | 'manifest'
  | 'playing'
  | 'recovery'
  | 'resync'
  | 'stall';

interface PlaybackMetricValues {
  bandwidthKbps?: number;
  bitrateKbps?: number;
  bufferedSeconds?: number;
  droppedFrames?: number;
  errorType?: string;
  fatal?: boolean;
  height?: number;
  latencySeconds?: number;
  levelCount?: number;
  recoveryReason?: 'fatal' | 'manual';
  startupSeconds?: number;
}
</script>

<template>
  <div
    ref="containerRef"
    class="stream-player-container relative flex h-full w-full min-w-0 items-center justify-center bg-black"
  >
    <video
      ref="videoRef"
      crossorigin="use-credentials"
      playsinline
      autoplay
      class="h-full w-full object-contain"
      @play="isPaused = false"
      @pause="isPaused = true"
      @waiting="handleWaiting"
      @stalled="handleWaiting"
      @canplay="isBuffering = false"
      @playing="handlePlaying"
      @volumechange="handleVolumeChange"
      @error="handleVideoError"
      @click="togglePlay"
    />
    <div
      v-if="isBuffering"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <Loader2 class="stream-buffering-indicator h-14 w-14 animate-spin text-primary" />
    </div>
    <div
      class="stream-control-bar absolute inset-x-0 bottom-0 box-border flex w-full items-center justify-between px-2 pt-8 pb-2 sm:px-4 sm:pb-1"
    >
      <TooltipProvider>
        <div class="flex items-center gap-1 sm:gap-4">
          <div class="flex items-center">
            <button
              type="button"
              class="stream-control-button flex h-9 w-9 items-center justify-center text-white"
              :aria-label="isPaused ? 'Play' : 'Pause'"
              @click="togglePlay"
            >
              <Play v-if="isPaused" class="h-5 w-5" />
              <Pause v-else class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="stream-control-button flex h-9 w-9 items-center justify-center text-white"
              :aria-label="isMuted ? 'Unmute' : 'Mute'"
              @click="toggleMute"
            >
              <VolumeX v-if="isMuted" class="h-5 w-5" />
              <Volume2 v-else class="h-5 w-5" />
            </button>
            <div
              class="relative hidden h-10 w-[90px] cursor-pointer touch-none items-center pl-4 opacity-80 transition-opacity hover:opacity-100 sm:flex"
              role="slider"
              aria-label="Volume"
              :aria-valuenow="Math.round((isMuted ? 0 : volume) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              @pointerdown="onVolumePointerDown"
              @pointermove="onVolumePointerMove"
            >
              <div data-volume-track class="relative h-1 w-full rounded-full bg-white/30">
                <div
                  class="absolute h-full rounded-full bg-primary"
                  :style="{ width: volumeFill }"
                />
              </div>
              <div
                class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-primary"
                :style="{ left: `calc(1rem + (100% - 1rem) * ${(isMuted ? 0 : volume)})` }"
              />
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 sm:gap-2">
          <Tooltip v-if="isDev || isLive">
            <TooltipTrigger as-child>
              <button
                type="button"
                class="stream-control-button flex h-9 w-9 items-center justify-center text-white"
                aria-label="Retry stream"
                @click="triggerRecovery('manual')"
              >
                <RefreshCw
                  :class="cn('h-5 w-5 shrink-0', isRecovering && 'animate-spin')"
                  :stroke-width="2.5"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Retry stream</TooltipContent>
          </Tooltip>
          <button
            type="button"
            :class="
              cn(
                'stream-control-button flex h-9 w-9 items-center justify-center text-white',
                !canFullscreen && 'hidden'
              )
            "
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            @click="toggleFullscreen"
          >
            <Minimize v-if="isFullscreen" class="h-5 w-5" />
            <Maximize v-else class="h-5 w-5" />
          </button>
        </div>
      </TooltipProvider>
    </div>
  </div>
</template>
