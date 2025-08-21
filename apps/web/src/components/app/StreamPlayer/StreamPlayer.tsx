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
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          liveDurationInfinity: true,
          enableWorker: true,
          backBufferLength: 5,
          startLevel: -1,
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
          debug: process.env.NODE_ENV === 'development',
          maxBufferSize: 60 * 1000 * 1000, // 60mb
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
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
