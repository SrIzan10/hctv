'use client';

import { useParams } from 'next/navigation';
import {
  MediaController,
  MediaLoadingIndicator,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
  MediaVolumeRange,
  MediaFullscreenButton,
} from 'media-chrome/react';
import HlsVideo from 'hls-video-element/react';

export default function StreamPlayer() {
  const { username } = useParams();

  return (
    <MediaController className="w-full aspect-video">
      <HlsVideo
        src={`${process.env.NEXT_PUBLIC_MEDIAMTX_URL}/${username}/index.m3u8`}
        slot="media"
        crossOrigin="anonymous"
        autoplay
        config={{
          xhrSetup: async (xhr: XMLHttpRequest, url: string) => {
            const user = 'skibiditoilet';
            const pass = getCookie('auth_session');
              const credentials = btoa(`${user}:${pass}`);
              xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
          },
          lowLatencyMode: true,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 2,
          liveDurationInfinity: true,
          enableWorker: true,
          backBufferLength: 1,
          startLevel: -1,
          maxBufferLength: 2,
          maxMaxBufferLength: 4,
          startFragPrefetch: true,
          testBandwidth: false,
          progressive: false,
          maxBufferSize: 10 * 1000 * 1000,
          maxBufferHole: 0.1,
          highBufferWatchdogPeriod: 0.5,
          nudgeOffset: 0.01,
          nudgeMaxRetry: 3,
          manifestLoadingTimeOut: 3000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 3000,
          fragLoadingTimeOut: 5000,
          debug: process.env.NODE_ENV === 'development',
          liveSyncDuration: 1,
          liveMaxLatencyDuration: 3,
          maxLiveSyncPlaybackRate: 1.5,
          liveBackBufferLength: 0,
        }}
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
  );
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
  return null;
}
