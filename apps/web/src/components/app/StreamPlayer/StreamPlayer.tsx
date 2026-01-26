'use client';

import { useParams } from 'next/navigation';
import { useRef, useEffect } from 'react';
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
import { MEDIAMTX_URL } from '@/lib/env';

export default function StreamPlayer() {
  const { username } = useParams();
  const { session } = useSession();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && username && session) {
      const user = 'skibiditoilet';
      const credentials = btoa(`${user}:${session.id}`);

      // @ts-ignore
      video.config = {
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Authorization', `Basic ${credentials}`);
        },
        lowLatencyMode: true,
        debug: process.env.NODE_ENV === 'development',
        backBufferLength: 90,
        enableWorker: true,
        maxLiveSyncPlaybackRate: 1.5,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
      };

      // @ts-ignore
      video.src = `${MEDIAMTX_URL}/${username}/index.m3u8`;
    }

    return () => {
      if (video) {
        // @ts-ignore
        video.src = '';
      }
    };
  }, [username, session]);

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
