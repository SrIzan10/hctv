'use client';

import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  TrackRefContext,
  useConnectionState,
  useParticipants,
  AudioTrack,
  StartAudio,
} from '@livekit/components-react';
import { getTrackReferenceId } from '@livekit/components-core';
import { Track } from 'livekit-client';
import { LoaderCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LiveStream({ username }: { username: string }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch(`/api/livekit/viewerToken?room=${username}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [username]);

  if (!token) return <div>Loading...</div>;

  return (
    <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true}>
      <StreamView />
    </LiveKitRoom>
  );
}

function StreamView() {
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
    Track.Source.ScreenShare,
    Track.Source.ScreenShareAudio,
  ]);
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const [isConnecting, setIsConnecting] = useState(true);

  const broadcasterTracks = tracks.filter((track) => track.participant.identity === 'streamer');

  // very hacky but works
  useEffect(() => {
    if (connectionState === 'connected') {
      const timer = setTimeout(() => setIsConnecting(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);
  useEffect(() => {
    console.log('participants', participants);
  }, [participants]);

  if (connectionState === 'connecting' || isConnecting) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <LoaderCircleIcon size={32} className="animate-spin text-white" />
          <p className="text-white">Connecting to stream...</p>
        </div>
      </div>
    );
  }
  if (connectionState === 'disconnected') {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <p className="text-white">Connection lost. Trying to reconnect...</p>
      </div>
    );
  }

  if (!broadcasterTracks.length) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <p className="text-white">Stream is currently offline</p>
      </div>
    );
  }

  const trackRef = broadcasterTracks[0];

  return (
    <div className="w-1/2 aspect-video bg-black">
      <TrackRefContext.Provider value={trackRef}>
        <VideoTrack trackRef={trackRef} className="w-full h-full" />
        <StartAudio
          label="Click to allow audio playback"
          className="absolute top-0 h-full w-full bg-gray-2-translucent text-white"
        />
        {broadcasterTracks.map((trackRef) => (
          <AudioTrack
            key={getTrackReferenceId(trackRef)}
            trackRef={trackRef}
            volume={1.0}
            muted={false}
          />
        ))}
      </TrackRefContext.Provider>
    </div>
  );
}
