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
  MediaFullscreenButton
} from 'media-chrome/react';
import HlsVideo from 'hls-video-element/react'

export default function StreamPlayer() {
  const { username } = useParams();

  return (
    <MediaController className='w-full aspect-video'>
      <HlsVideo
        src={`/api/rtmp/hls/${username}.m3u8`}
        slot="media"
        crossOrigin="anonymous"
        autoplay
        config={{
          lowLatencyMode: true,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 4,
          liveDurationInfinity: true,
          enableWorker: true,
          backBufferLength: 2,
          startLevel: 0,
          maxBufferLength: 4,
          maxMaxBufferLength: 8,
          startFragPrefetch: true,
          testBandwidth: false,
          progressive: true,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.3,
          highBufferWatchdogPeriod: 1,
          nudgeOffset: 0.05,
          nudgeMaxRetry: 2,
          manifestLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 5000,
          fragLoadingTimeOut: 10000,
          debug: process.env.NODE_ENV === 'development',
        }}
      />
      <MediaLoadingIndicator slot="centered-chrome" noAutohide />
      <MediaControlBar className='w-full px-2'>
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
