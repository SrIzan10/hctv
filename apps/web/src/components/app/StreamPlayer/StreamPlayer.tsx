'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Hls from 'hls.js';
import type { HlsJsAdapter, HlsSource } from '@videojs/hlsjs-video';
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
        // metrics reporting should never break playback.
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
          // catch-up rate. the latency controller ramps playback speed on a curve, so a cap this
          // low is just a gentle nudge, closing a one-second gap in about 7s.
          maxLiveSyncPlaybackRate: 1.15,
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
  const media = useMedia() as HlsJsAdapter | null;
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
      // autoplay can get rejected, that's fine, the controls are still there for manual playback.
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
      // we sample latency here too, not just on the heartbeat, since the heartbeat's 30s cadence
      // never lines up with a stall. without this we can't tell if the playhead starved because
      // it was too close to the edge or because a load was just slow.
      const engine: Hls | null = media.engine;
      reportPlayback('stall', {
        bufferedSeconds: getBufferedAhead(media),
        latencySeconds: engine?.latency || undefined,
      });
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
      const bufferedEnd = videoElement.currentTime + getBufferedAhead(media);
      const seekTarget = Math.min(syncPosition, bufferedEnd - RESYNC_BUFFER_MARGIN_SECONDS);
      if (seekTarget <= videoElement.currentTime) {
        return;
      }

      reportPlayback('resync', { latencySeconds: engine.latency });
      videoElement.currentTime = seekTarget;
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

function getBufferedAhead(media: HlsJsAdapter): number {
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
