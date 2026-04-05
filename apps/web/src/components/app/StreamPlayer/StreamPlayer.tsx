'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MediaController,
  MediaLoadingIndicator,
  MediaControlBar,
  MediaPlayButton,
  MediaMuteButton,
  MediaVolumeRange,
  MediaFullscreenButton,
} from 'media-chrome/react';
import { RefreshCw } from 'lucide-react';
import HlsVideo from 'hls-video-element/react';
import type { HlsVideoElement } from 'hls-video-element';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/providers/SessionProvider';
import { useUserStreamInfo } from '@/lib/hooks/useUserList';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';

const WAITING_RECOVERY_DELAY_MS = 8000;
const RECOVERY_COOLDOWN_MS = 2000;

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  const { streamInfo: userInfo } = useUserStreamInfo(resolvedUsername, true, 5000);

  const videoRef = useRef<HlsVideoElement | null>(null);
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRecoveryAtRef = useRef(0);
  const [playerKey, setPlayerKey] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const streamSrc = useMemo(() => {
    if (!resolvedUsername || !userInfo?.isLive || !userInfo.streamRegion) {
      return null;
    }

    return `${getMediamtxClientEnvs(userInfo.streamRegion as MediaMTXRegion).publicUrl}/${resolvedUsername}/index.m3u8?reload=${playerKey}`;
  }, [playerKey, resolvedUsername, userInfo?.isLive, userInfo?.streamRegion]);

  const clearWaitingTimeout = useCallback(() => {
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }
  }, []);

  const triggerRecovery = useCallback(
    (reason: string) => {
      if (!session || !resolvedUsername || !userInfo?.isLive) {
        return;
      }

      const now = Date.now();
      if (now - lastRecoveryAtRef.current < RECOVERY_COOLDOWN_MS) {
        return;
      }

      lastRecoveryAtRef.current = now;
      clearWaitingTimeout();
      setIsRecovering(true);
      setPlayerKey((currentKey) => currentKey + 1);

      if (process.env.NODE_ENV === 'development') {
        console.debug('[StreamPlayer] Recovering playback', {
          reason,
          username: resolvedUsername,
        });
      }
    },
    [clearWaitingTimeout, resolvedUsername, session, userInfo?.isLive]
  );

  useEffect(() => {
    if (!isRecovering) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsRecovering(false);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [isRecovering]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && streamSrc && session) {
      const user = 'skibiditoilet';
      const credentials = btoa(`${user}:${session.id}`);

      video.config = {
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
        },
        lowLatencyMode: true,
        debug: process.env.NODE_ENV === 'development',
        backBufferLength: 90,
        enableWorker: true,
        maxLiveSyncPlaybackRate: 1,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
      };

      video.src = streamSrc;
      video.load();

      void video.play().catch(() => {
        // Ignore autoplay rejections; the controls remain available for manual playback.
      });
    } else if (video) {
      clearWaitingTimeout();
      video.removeAttribute('src');
      video.load();
    }

    return () => {
      if (video) {
        clearWaitingTimeout();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [clearWaitingTimeout, session, streamSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleWaiting = () => {
      clearWaitingTimeout();
      waitingTimeoutRef.current = setTimeout(() => {
        triggerRecovery('waiting_timeout');
      }, WAITING_RECOVERY_DELAY_MS);
    };

    const clearRecoverySignals = () => {
      clearWaitingTimeout();
      setIsRecovering(false);
    };

    const handlePlaybackFailure = () => {
      triggerRecovery('media_event');
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handlePlaybackFailure);
    video.addEventListener('error', handlePlaybackFailure);
    video.addEventListener('abort', handlePlaybackFailure);
    video.addEventListener('emptied', handlePlaybackFailure);
    video.addEventListener('ended', handlePlaybackFailure);
    video.addEventListener('playing', clearRecoverySignals);
    video.addEventListener('canplay', clearRecoverySignals);
    video.addEventListener('loadeddata', clearRecoverySignals);

    return () => {
      clearWaitingTimeout();
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handlePlaybackFailure);
      video.removeEventListener('error', handlePlaybackFailure);
      video.removeEventListener('abort', handlePlaybackFailure);
      video.removeEventListener('emptied', handlePlaybackFailure);
      video.removeEventListener('ended', handlePlaybackFailure);
      video.removeEventListener('playing', clearRecoverySignals);
      video.removeEventListener('canplay', clearRecoverySignals);
      video.removeEventListener('loadeddata', clearRecoverySignals);
    };
  }, [clearWaitingTimeout, playerKey, triggerRecovery]);

  return (
    <div className="relative">
      <MediaController className="w-full aspect-video">
        <HlsVideo
          key={playerKey}
          ref={videoRef}
          slot="media"
          crossOrigin="anonymous"
          playsInline
          autoplay
        />
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

      {userInfo?.isLive && (
        <div className="pointer-events-none absolute right-3 top-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="pointer-events-auto gap-2"
            onClick={() => triggerRecovery('manual_retry')}
            disabled={isRecovering || !session}
          >
            <RefreshCw className={isRecovering ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {isRecovering ? 'Reconnecting...' : 'Retry stream'}
          </Button>
        </div>
      )}
    </div>
  );
}
