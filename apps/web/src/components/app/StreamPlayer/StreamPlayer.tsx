'use client';

import { useParams } from 'next/navigation';
import { useRef, useEffect } from 'react';
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
import { useSession } from '@/lib/providers/SessionProvider';

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && username) {
      const user = 'skibiditoilet';
      const credentials = btoa(`${user}:${session!.id}`);

      // @ts-ignore
      videoRef.current.config = {
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
          xhr.setRequestHeader('hi', 'afjlkafbjadlkfghbjlk');
        },
        lowLatencyMode: true,
        debug: process.env.NODE_ENV === 'development',
      };

      // @ts-ignore
      videoRef.current.src = `${process.env.NEXT_PUBLIC_MEDIAMTX_URL}/${username}/index.m3u8`;
    }
  }, [username]);

  return (
    <MediaController className="w-full aspect-video">
      <HlsVideo
        ref={videoRef}
        slot="media"
        crossOrigin="anonymous"
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
  );
}
