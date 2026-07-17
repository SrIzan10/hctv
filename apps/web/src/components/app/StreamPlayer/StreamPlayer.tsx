'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorTypes, Events } from 'hls.js';
import HlsVideo from 'hls-video-element/react';
import type { HlsVideoElement } from 'hls-video-element';
import { RefreshCw } from 'lucide-react';
import {
  MediaChromeButton,
  MediaController,
  MediaControlBar,
  MediaFullscreenButton,
  MediaLoadingIndicator,
  MediaMuteButton,
  MediaPlayButton,
  MediaVolumeRange,
} from 'media-chrome/react';
import { useUserStreamInfo } from '@/lib/hooks/useUserList';
import { useSession } from '@/lib/providers/SessionProvider';
import { cn } from '@/lib/utils';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';

const FATAL_RECOVERY_COOLDOWN_MS = 5000;
const HLS_ATTACH_RETRY_MS = 50;
const HLS_ATTACH_MAX_ATTEMPTS = 100;
const PLAYBACK_HEARTBEAT_MS = 30_000;

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  const { streamInfo: userInfo } = useUserStreamInfo(resolvedUsername, true, 5000);

  const videoRef = useRef<HlsVideoElement | null>(null);
  const lastRecoveryAtRef = useRef(0);
  const playbackStartedAtRef = useRef(0);
  const hasReportedPlayingRef = useRef(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
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

  const triggerRecovery = useCallback(
    (reason: 'fatal' | 'manual') => {
      if (!session || !resolvedUsername || !userInfo?.isLive) {
        return;
      }

      const now = Date.now();
      if (reason === 'fatal' && now - lastRecoveryAtRef.current < FATAL_RECOVERY_COOLDOWN_MS) {
        return;
      }

      lastRecoveryAtRef.current = now;
      playbackStartedAtRef.current = performance.now();
      hasReportedPlayingRef.current = false;
      setIsRecovering(true);
      setPlayerKey((currentKey) => currentKey + 1);
      reportPlayback('recovery', { recoveryReason: reason });
    },
    [reportPlayback, resolvedUsername, session, userInfo?.isLive]
  );

  useEffect(() => {
    if (!isRecovering) {
      return;
    }

    const timeout = setTimeout(() => setIsRecovering(false), 1200);
    return () => clearTimeout(timeout);
  }, [isRecovering]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamSrc || !session) {
      return;
    }

    const credentials = btoa(`skibiditoilet:${session.id}`);
    playbackStartedAtRef.current = performance.now();
    hasReportedPlayingRef.current = false;

    video.config = {
      xhrSetup: (xhr: XMLHttpRequest) => {
        xhr.withCredentials = true;
        xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
      },
      lowLatencyMode: false,
      enableWorker: true,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000,
      liveSyncMode: 'buffered',
      liveSyncDurationCount: 4,
      liveMaxLatencyDurationCount: 12,
      liveSyncOnStallIncrease: 1,
      maxLiveSyncPlaybackRate: 1.1,
      capLevelToPlayerSize: true,
      capLevelOnFPSDrop: true,
      startLevel: -1,
      testBandwidth: true,
      fragLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: 15_000,
          maxLoadTimeMs: 120_000,
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
    };

    video.src = streamSrc;
    reportPlayback('load');

    void video.play().catch(() => {
      // Autoplay can be rejected; the controls remain available for manual playback.
    });

    return () => {
      video.removeAttribute('src');
    };
  }, [playerKey, reportPlayback, session, streamSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamSrc) {
      return;
    }

    let attachTimeout: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const networkRecoveryTimeouts = new Set<ReturnType<typeof setTimeout>>();
    let attachedHls = video.api;
    let attachAttempts = 0;
    let fatalNetworkRecoveries = 0;
    let lastMediaRecoveryAt = 0;
    let lastDroppedFrames = 0;
    let lastStallAt = 0;

    const handleWaiting = () => {
      const now = Date.now();
      if (now - lastStallAt < 1000) {
        return;
      }
      lastStallAt = now;
      reportPlayback('stall', { bufferedSeconds: getBufferedAhead(video) });
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

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    const attachHlsListeners = () => {
      attachedHls = video.api;
      if (!attachedHls) {
        attachAttempts += 1;
        if (attachAttempts < HLS_ATTACH_MAX_ATTEMPTS) {
          attachTimeout = setTimeout(attachHlsListeners, HLS_ATTACH_RETRY_MS);
        }
        return;
      }

      attachedHls.on(Events.MANIFEST_PARSED, (_event, data) => {
        reportPlayback('manifest', { levelCount: data.levels.length });
      });
      attachedHls.on(Events.LEVEL_SWITCHED, (_event, data) => {
        const level = attachedHls?.levels[data.level];
        reportPlayback('level', {
          bitrateKbps: level ? level.bitrate / 1000 : undefined,
          height: level?.height,
        });
      });
      attachedHls.on(Events.FRAG_LOADED, () => {
        fatalNetworkRecoveries = 0;
      });
      attachedHls.on(Events.ERROR, (_event, data) => {
        reportPlayback('error', {
          errorType: data.type,
          fatal: data.fatal,
        });

        if (!data.fatal || !attachedHls) {
          return;
        }

        if (data.type === ErrorTypes.MEDIA_ERROR) {
          const now = Date.now();
          if (now - lastMediaRecoveryAt >= FATAL_RECOVERY_COOLDOWN_MS) {
            lastMediaRecoveryAt = now;
            attachedHls.recoverMediaError();
          }
          return;
        }

        if (data.type === ErrorTypes.NETWORK_ERROR && fatalNetworkRecoveries < 3) {
          fatalNetworkRecoveries += 1;
          const hls = attachedHls;
          const recoveryTimeout = setTimeout(() => {
            networkRecoveryTimeouts.delete(recoveryTimeout);
            if (video.api === hls) {
              hls.startLoad();
            }
          }, 1000 * fatalNetworkRecoveries);
          networkRecoveryTimeouts.add(recoveryTimeout);
          return;
        }

        triggerRecovery('fatal');
      });

      heartbeat = setInterval(() => {
        const quality = video.getVideoPlaybackQuality?.();
        const droppedFrames = quality?.droppedVideoFrames ?? 0;
        reportPlayback('heartbeat', {
          bandwidthKbps: attachedHls ? attachedHls.bandwidthEstimate / 1000 : undefined,
          bufferedSeconds: getBufferedAhead(video),
          droppedFrames: Math.max(0, droppedFrames - lastDroppedFrames),
          fatal: false,
        });
        lastDroppedFrames = droppedFrames;
      }, PLAYBACK_HEARTBEAT_MS);
    };

    attachHlsListeners();

    return () => {
      if (attachTimeout) clearTimeout(attachTimeout);
      if (heartbeat) clearInterval(heartbeat);
      for (const recoveryTimeout of networkRecoveryTimeouts) {
        clearTimeout(recoveryTimeout);
      }
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [playerKey, reportPlayback, streamSrc, triggerRecovery]);

  return (
    <div className="relative flex h-full w-full min-w-0 items-center justify-center bg-black">
      <MediaController className="h-full w-full">
        <HlsVideo
          key={playerKey}
          ref={videoRef}
          slot="media"
          crossOrigin="use-credentials"
          playsInline
          autoplay
          className="h-full w-full object-contain"
        />
        <MediaLoadingIndicator slot="centered-chrome" noAutohide />
        <MediaControlBar className="w-full px-2 pb-1 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-4">
            <div className="flex items-center">
              <MediaPlayButton />
              <MediaMuteButton />
              <MediaVolumeRange className="hidden pl-4 opacity-80 transition-opacity hover:opacity-100 sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {(process.env.NODE_ENV === 'development' || userInfo?.isLive) && (
              <MediaChromeButton onClick={() => triggerRecovery('manual')}>
                <span className="flex h-4 w-4 items-center justify-center">
                  <RefreshCw
                    className={cn('h-5 w-5 shrink-0', isRecovering && 'animate-spin')}
                    strokeWidth={2.5}
                  />
                </span>
                <span slot="tooltip-content">Retry stream</span>
              </MediaChromeButton>
            )}
            <MediaFullscreenButton />
          </div>
        </MediaControlBar>
      </MediaController>
    </div>
  );
}

function getBufferedAhead(video: HlsVideoElement): number {
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

type PlaybackMetricEvent =
  | 'error'
  | 'heartbeat'
  | 'level'
  | 'load'
  | 'manifest'
  | 'playing'
  | 'recovery'
  | 'stall';

interface PlaybackMetricValues {
  bandwidthKbps?: number;
  bitrateKbps?: number;
  bufferedSeconds?: number;
  droppedFrames?: number;
  errorType?: string;
  fatal?: boolean;
  height?: number;
  levelCount?: number;
  recoveryReason?: 'fatal' | 'manual';
  startupSeconds?: number;
}
