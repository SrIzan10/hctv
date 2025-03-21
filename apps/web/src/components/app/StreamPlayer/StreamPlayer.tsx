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
          liveSyncDurationCount: 2, // Use only 1 segment for sync
          liveMaxLatencyDurationCount: 3, // Maximum latency allowed
          liveDurationInfinity: true,
          enableWorker: true,
          backBufferLength: 0, // No back buffer
          startLevel: -1, // Auto level selection
          maxBufferLength: 4, // Maximum buffer length in seconds
          maxMaxBufferLength: 6,
          debug: false,
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
