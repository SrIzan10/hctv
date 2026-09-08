'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Hls from 'hls.js';
import type { HlsJsMedia, HlsSource } from '@videojs/media/dom/hls-js';
import {
  BufferingIndicator,
  Container,
  Controls,
  FullscreenButton,
  MuteButton,
  PlayButton,
  Tooltip,
  VolumeSlider,
  createPlayer,
  liveVideoFeatures,
  selectError,
  selectQuality,
} from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { Loader2, Maximize, Minimize, Pause, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useUserStreamInfo } from '@/lib/hooks/useUserList';
import { useSession } from '@/lib/providers/SessionProvider';
import { cn } from '@/lib/utils';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';

const FATAL_RECOVERY_COOLDOWN_MS = 5000;
const PLAYBACK_HEARTBEAT_MS = 30_000;

// MediaMTX publishes 1s segments split into 200ms LL-HLS parts (docker/mediamtx/mediamtx.yml),
// so EXT-X-TARGETDURATION is 1. That makes the `*DurationCount` knobs a 1s-per-step ruler, which
// is too coarse to tune a sub-2s budget with, so the latency window is expressed in seconds.
// hls.js throws if the count and seconds families are mixed in one config.
const TARGET_LATENCY_SECONDS = 1.4;
const MAX_LATENCY_SECONDS = 6;

const { Player, usePlayer, useMedia } = createPlayer({ features: liveVideoFeatures });

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  const { streamInfo: userInfo } = useUserStreamInfo(resolvedUsername, true, 5000);
  const region = userInfo?.streamRegion as MediaMTXRegion | undefined;

  const streamSrc = useMemo(() => {
    if (!resolvedUsername || !userInfo?.isLive || !region) {
      return null;
    }

    return `${getMediamtxClientEnvs(region).publicUrl}/${resolvedUsername}/index.m3u8`;
  }, [region, resolvedUsername, userInfo?.isLive]);

  const reportPlayback = useCallback(
    (event: PlaybackMetricEvent, values: PlaybackMetricValues = {}) => {
      if (!region) {
        return;
      }

      void fetch('/api/metrics/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, region, ...values }),
        keepalive: true,
      }).catch(() => {
        // QoE reporting must never interrupt playback.
      });
    },
    [region]
  );

  const source = useMemo<HlsSource | null>(() => {
    if (!streamSrc || !session) {
      return null;
    }

    const credentials = btoa(`skibiditoilet:${session.id}`);

    return {
      src: streamSrc,
      preferPlayback: 'mse',
      engine: {
        hlsJs: {
          xhrSetup: (xhr: XMLHttpRequest) => {
            xhr.withCredentials = true;
            xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
          },
          lowLatencyMode: true,
          enableWorker: true,

          // Defining liveSyncDuration makes hls.js target this instead of the playlist's
          // PART-HOLD-BACK, whose spec floor is 3 part durations (600ms here) — under a second of
          // slack, which no viewer can hold once a blocking playlist reload has to cross the
          // Cloudflare edge to reach the origin. So the budget is picked here instead, and
          // liveSyncOnStallIncrease relaxes it by up to one target duration for viewers that keep
          // stalling at this distance from the edge.
          liveSyncDuration: TARGET_LATENCY_SECONDS,
          liveMaxLatencyDuration: MAX_LATENCY_SECONDS,
          liveSyncOnStallIncrease: 1,
          // Catch-up rate. The latency controller ramps playbackRate on a sigmoid, so a cap this
          // low only ever applies a gentle nudge; 1.15 closes a one-second gap in ~7s.
          maxLiveSyncPlaybackRate: 1.15,
          // Re-sync inside what is already buffered rather than hard-seeking to the edge and
          // re-buffering from empty.
          liveSyncMode: 'buffered',

          // Buffer caps. At the live edge the forward buffer is bounded by the edge itself, so
          // these bound memory and how much catch-up material is retained, not latency.
          backBufferLength: 10,
          maxBufferLength: 10,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000,

          // Stall handling sized for a ~1.4s buffer: the defaults wait 2s and nudge 3 times,
          // which is longer than the whole buffer this player holds.
          highBufferWatchdogPeriod: 1,
          nudgeMaxRetry: 5,
          // The 0.25s default is wider than a single 200ms part, which blurs part lookup at the edge.
          maxFragLookUpTolerance: 0.1,

          // Start playing off the first playlist rather than waiting for a bandwidth probe.
          initialLiveManifestSize: 1,
          startFragPrefetch: true,
          startLevel: 0,
          testBandwidth: false,

          // Blocking playlist reloads are long-polls held open by the origin until the next part
          // exists, so first-byte time is legitimately ~a part duration plus the edge-to-origin
          // round trip. Past that the publisher is the one stalling and a fresh request beats
          // waiting out the 10s default.
          playlistLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 5_000,
              maxLoadTimeMs: 10_000,
              timeoutRetry: {
                maxNumRetry: 3,
                retryDelayMs: 0,
                maxRetryDelayMs: 0,
              },
              errorRetry: {
                maxNumRetry: 3,
                retryDelayMs: 250,
                maxRetryDelayMs: 2000,
                backoff: 'exponential',
              },
            },
          },
          // Parts are 200ms of media, so hanging on one is pure latency debt for the catch-up rate
          // to pay off later: cut first-byte time to a third of what it was. Total load time stays
          // generous on purpose — that limit catches slow-but-progressing transfers, where a retry
          // is no faster than letting the current one finish.
          fragLoadPolicy: {
            default: {
              maxTimeToFirstByteMs: 3_000,
              maxLoadTimeMs: 30_000,
              timeoutRetry: {
                maxNumRetry: 4,
                retryDelayMs: 250,
                maxRetryDelayMs: 2000,
                backoff: 'exponential',
              },
              errorRetry: {
                maxNumRetry: 6,
                retryDelayMs: 500,
                maxRetryDelayMs: 8000,
                backoff: 'exponential',
              },
            },
          },
          debug: process.env.NODE_ENV === 'development',
        },
      },
    };
  }, [session, streamSrc]);

  return (
    <Player>
      <StreamPlayerContent
        source={source}
        isLive={Boolean(userInfo?.isLive)}
        reportPlayback={reportPlayback}
      />
    </Player>
  );
}

function StreamPlayerContent({
  source,
  isLive,
  reportPlayback,
}: {
  source: HlsSource | null;
  isLive: boolean;
  reportPlayback: (event: PlaybackMetricEvent, values?: PlaybackMetricValues) => void;
}) {
  const media = useMedia() as HlsJsMedia | null;
  const error = usePlayer(selectError);
  const quality = usePlayer(selectQuality);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const lastRecoveryAtRef = useRef(0);
  const playbackStartedAtRef = useRef(0);
  const hasReportedPlayingRef = useRef(false);
  const lastRenditionCountRef = useRef(0);
  const lastActiveRenditionKeyRef = useRef<string | undefined>(undefined);
  const lastDroppedFramesRef = useRef(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const triggerRecovery = useCallback(
    (reason: 'fatal' | 'manual') => {
      if (!media) {
        return;
      }

      const now = Date.now();
      if (reason === 'fatal' && now - lastRecoveryAtRef.current < FATAL_RECOVERY_COOLDOWN_MS) {
        return;
      }

      lastRecoveryAtRef.current = now;
      playbackStartedAtRef.current = performance.now();
      hasReportedPlayingRef.current = false;
      lastDroppedFramesRef.current = 0;
      setIsRecovering(true);
      reportPlayback('recovery', { recoveryReason: reason });
      void media.load();
    },
    [media, reportPlayback]
  );

  useEffect(() => {
    if (!isRecovering) {
      return;
    }

    const timeout = setTimeout(() => setIsRecovering(false), 1200);
    return () => clearTimeout(timeout);
  }, [isRecovering]);

  useEffect(() => {
    if (!media || !source) {
      return;
    }

    playbackStartedAtRef.current = performance.now();
    hasReportedPlayingRef.current = false;
    reportPlayback('load');

    void media.play().catch(() => {
      // Autoplay can be rejected; the controls remain available for manual playback.
    });
  }, [media, reportPlayback, source]);

  useEffect(() => {
    if (!media) {
      return;
    }

    let lastStallAt = 0;

    const handleWaiting = () => {
      const now = Date.now();
      if (now - lastStallAt < 1000) {
        return;
      }
      lastStallAt = now;
      reportPlayback('stall', { bufferedSeconds: getBufferedAhead(media) });
    };

    const handlePlaying = () => {
      setIsRecovering(false);
      if (!hasReportedPlayingRef.current) {
        hasReportedPlayingRef.current = true;
        reportPlayback('playing', {
          startupSeconds: (performance.now() - playbackStartedAtRef.current) / 1000,
        });
      }
    };

    media.addEventListener('waiting', handleWaiting);
    media.addEventListener('stalled', handleWaiting);
    media.addEventListener('playing', handlePlaying);

    return () => {
      media.removeEventListener('waiting', handleWaiting);
      media.removeEventListener('stalled', handleWaiting);
      media.removeEventListener('playing', handlePlaying);
    };
  }, [media, reportPlayback]);

  useEffect(() => {
    if (!media) {
      return;
    }

    const heartbeat = setInterval(() => {
      const engine: Hls | null = media.engine;
      const droppedFrames = videoElementRef.current?.getVideoPlaybackQuality?.().droppedVideoFrames ?? 0;
      reportPlayback('heartbeat', {
        bandwidthKbps: engine ? engine.bandwidthEstimate / 1000 : undefined,
        bufferedSeconds: getBufferedAhead(media),
        droppedFrames: Math.max(0, droppedFrames - lastDroppedFramesRef.current),
        latencySeconds: engine?.latency || undefined,
        fatal: false,
      });
      lastDroppedFramesRef.current = droppedFrames;
    }, PLAYBACK_HEARTBEAT_MS);

    return () => clearInterval(heartbeat);
  }, [media, reportPlayback]);

  useEffect(() => {
    if (!media) {
      return;
    }

    const handleVisibilityChange = () => {
      const videoElement = videoElementRef.current;
      const engine: Hls | null = media.engine;
      if (document.visibilityState !== 'visible' || !videoElement || !engine) {
        return;
      }

      const details = engine.latestLevelDetails;
      const targetLatency = engine.targetLatency;
      const syncPosition = engine.liveSyncPosition;
      if (!details?.live || targetLatency === null || syncPosition === null) {
        return;
      }

      // Backgrounded tabs get throttled and drift behind the edge, but hls.js only force-seeks
      // once latency passes liveMaxLatencyDuration. Anything between the target and that ceiling
      // is left to the catch-up playback rate, which needs tens of seconds to claw back the
      // seconds a background pause adds. Seeking on the way back is instant instead.
      if (engine.latency <= targetLatency + details.targetduration) {
        return;
      }
      if (syncPosition <= videoElement.currentTime) {
        return;
      }

      reportPlayback('resync', { latencySeconds: engine.latency });
      videoElement.currentTime = syncPosition;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [media, reportPlayback]);

  useEffect(() => {
    if (!quality) {
      return;
    }

    const renditionCount = quality.videoRenditionList.length;
    if (renditionCount && renditionCount !== lastRenditionCountRef.current) {
      lastRenditionCountRef.current = renditionCount;
      reportPlayback('manifest', { levelCount: renditionCount });
    }

    const active = quality.activeVideoRendition;
    if (active) {
      const activeKey = active.id ?? `${active.bitrate ?? ''}x${active.height ?? ''}`;
      if (activeKey !== lastActiveRenditionKeyRef.current) {
        lastActiveRenditionKeyRef.current = activeKey;
        reportPlayback('level', {
          bitrateKbps: active.bitrate ? active.bitrate / 1000 : undefined,
          height: active.height,
        });
      }
    }
  }, [quality, reportPlayback]);

  const mediaError = error?.error;

  useEffect(() => {
    if (!mediaError) {
      return;
    }

    reportPlayback('error', { errorType: String(mediaError.code), fatal: true });
    triggerRecovery('fatal');
  }, [mediaError, reportPlayback, triggerRecovery]);

  return (
    <Container className="stream-player-container relative flex h-full w-full min-w-0 items-center justify-center bg-black">
      <HlsJsVideo
        ref={videoElementRef}
        source={source ?? undefined}
        crossOrigin="use-credentials"
        playsInline
        autoPlay
        className="h-full w-full object-contain"
      />
      <BufferingIndicator
        render={(props, state) =>
          state.visible ? (
            <div {...props} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 className="stream-buffering-indicator h-14 w-14 animate-spin text-primary" />
            </div>
          ) : null
        }
      />
      <Controls.Root>
        <Controls.Content className="stream-control-bar absolute inset-x-0 bottom-0 box-border flex w-full items-center justify-between px-2 pt-8 pb-1 sm:px-4">
          <Tooltip.Provider>
            <div className="flex items-center gap-1 sm:gap-4">
              <div className="flex items-center">
                <PlayButton
                  className="stream-control-button"
                  render={(props, state) => (
                    <button {...props} type="button">
                      {state.paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </button>
                  )}
                />
                <MuteButton
                  className="stream-control-button"
                  render={(props, state) => (
                    <button {...props} type="button">
                      {state.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  )}
                />
                <VolumeSlider.Root className="hidden h-10 w-[90px] items-center pl-4 opacity-80 transition-opacity hover:opacity-100 sm:flex">
                  <VolumeSlider.Track className="relative h-1 w-full rounded-full bg-white/30">
                    <VolumeSlider.Fill className="absolute h-full rounded-full bg-primary" />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className="h-3 w-3 rounded-full bg-primary" />
                </VolumeSlider.Root>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {(process.env.NODE_ENV === 'development' || isLive) && (
                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <button
                        type="button"
                        onClick={() => triggerRecovery('manual')}
                        className="stream-control-button flex h-9 w-9 items-center justify-center"
                      >
                        <RefreshCw
                          className={cn('h-5 w-5 shrink-0', isRecovering && 'animate-spin')}
                          strokeWidth={2.5}
                        />
                      </button>
                    }
                  />
                  <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
                    <Tooltip.Label>Retry stream</Tooltip.Label>
                  </Tooltip.Popup>
                </Tooltip.Root>
              )}
              <FullscreenButton
                className={(state) => cn('stream-control-button', state.hidden && 'hidden')}
                render={(props, state) => (
                  <button {...props} type="button">
                    {state.fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </button>
                )}
              />
            </div>
          </Tooltip.Provider>
        </Controls.Content>
      </Controls.Root>
    </Container>
  );
}

function getBufferedAhead(media: HlsJsMedia): number {
  for (let index = 0; index < media.buffered.length; index += 1) {
    if (
      media.currentTime >= media.buffered.start(index) &&
      media.currentTime <= media.buffered.end(index)
    ) {
      return Math.max(0, media.buffered.end(index) - media.currentTime);
    }
  }

  return 0;
}

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
