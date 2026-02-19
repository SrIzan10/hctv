'use client';

import { useParams } from 'next/navigation';
import { useRef, useEffect, useCallback } from 'react';
import {
  MediaController,
  MediaLoadingIndicator,
  MediaControlBar,
  MediaPlayButton,
  MediaMuteButton,
  MediaVolumeRange,
  MediaFullscreenButton,
} from 'media-chrome/react';
import HlsVideo from 'hls-video-element/react';
import { useSession } from '@/lib/providers/SessionProvider';
import { useUserStreamInfo } from '@/lib/hooks/useUserList';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';

const RETRY_POLICY = {
  maxTimeToFirstByteMs: 10000,
  maxLoadTimeMs: 120000,
  timeoutRetry: {
    maxNumRetry: 4,
    retryDelayMs: 500,
    maxRetryDelayMs: 4000,
  },
  errorRetry: {
    maxNumRetry: 6,
    retryDelayMs: 1000,
    maxRetryDelayMs: 8000,
    backoff: 'exponential' as const,
  },
};

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const { streamInfo: userInfo } = useUserStreamInfo(username!.toString());

  const videoRef = useRef<any>(null);
  const recoverAttemptsRef = useRef(0);

  const getHlsInstance = useCallback(() => {
    const video = videoRef.current;
    return video?.api ?? null;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video && username && session) {
      const user = 'skibiditoilet';
      const credentials = btoa(`${user}:${session.id}`);

      video.config = {
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
        },

        // Worker & progressive streaming
        enableWorker: true,
        progressive: true,
        startFragPrefetch: true,

        // Buffer — generous forward buffer, trim back buffer
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
        maxBufferHole: 0.5,
        backBufferLength: 30,

        // ABR — conservative upswitch, fast downswitch
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
        startLevel: -1,
        capLevelToPlayerSize: true,
        capLevelOnFPSDrop: true,

        // Live sync — stable playback, avoid aggressive edge-chasing
        lowLatencyMode: false,
        liveSyncDurationCount: 4,
        liveMaxLatencyDurationCount: 12,
        maxLiveSyncPlaybackRate: 1.1,
        liveSyncOnStallIncrease: 1,

        // Stall detection & recovery
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        nudgeOnVideoHole: true,

        // Retry policies for manifest, playlist, and fragment loading
        fragLoadPolicy: { default: RETRY_POLICY },
        manifestLoadPolicy: { default: RETRY_POLICY },
        playlistLoadPolicy: { default: RETRY_POLICY },

        // Buffer append error retry
        appendErrorMaxRetry: 5,

        debug: process.env.NODE_ENV === 'development',
      };

      const region = (userInfo?.streamRegion ?? 'hq') as Parameters<
        typeof getMediamtxClientEnvs
      >[0];
      video.src = `${getMediamtxClientEnvs(region).publicUrl}/${username}/index.m3u8`;

      // Reset recovery counter on successful playback start
      recoverAttemptsRef.current = 0;
    }

    return () => {
      if (video) {
        video.src = '';
      }
    };
  }, [username, session, userInfo?.streamRegion]);

  // Fatal error recovery — separate effect so it doesn't re-trigger source loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const MAX_RECOVER = 3;

    const handleError = () => {
      const hls = getHlsInstance();
      if (!hls) return;

      if (recoverAttemptsRef.current < MAX_RECOVER) {
        recoverAttemptsRef.current++;
        if (recoverAttemptsRef.current <= 2) {
          hls.recoverMediaError();
        } else {
          hls.swapAudioCodec();
          hls.recoverMediaError();
        }
      }
    };

    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('error', handleError);
    };
  }, [getHlsInstance]);

  return (
    <MediaController className="w-full aspect-video">
      <HlsVideo ref={videoRef} slot="media" crossOrigin="anonymous" autoplay />
      <MediaLoadingIndicator slot="centered-chrome" noAutohide />
      <MediaControlBar className="w-full px-2">
        <div className="flex items-center gap-2">
          <MediaPlayButton />
          <MediaMuteButton />
          <MediaVolumeRange />
        </div>
        <div className="flex items-center gap-2">
          <MediaFullscreenButton />
        </div>
      </MediaControlBar>
    </MediaController>
  );
}
