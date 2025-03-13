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
        src={`${process.env.LIVE_SERVER_URL}/hls/${username}.m3u8`}
        slot="media"
        crossOrigin="anonymous"
        autoplay
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
