import useFullscreen from '@/lib/hooks/useFullscreen';
import {
  useTracks,
  useParticipants,
  useConnectionState,
  TrackRefContext,
  VideoTrack,
  StartAudio,
  AudioTrack,
} from '@livekit/components-react';
import { getTrackReferenceId } from '@livekit/components-core';
import { Track } from 'livekit-client';
import { LoaderCircleIcon, Minimize, Maximize, VolumeX, Volume2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function StreamPlayer() {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const handleVolumeChange = (newVolume: number, muted: boolean) => {
    setVolume(newVolume);
    setIsMuted(muted);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

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
    <div className="w-full aspect-video bg-black relative group" ref={containerRef}>
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
            volume={volume}
            muted={isMuted}
          />
        ))}
      </TrackRefContext.Provider>

      {/* controls */}
      <div className="absolute flex bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <VolumeControl
          onChange={handleVolumeChange}
          initialVolume={volume}
          initialMuted={isMuted}
        />
        <div className="flex-1" />
        <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>
    </div>
  );
}

function VolumeControl({
  onChange,
  initialVolume = 1,
  initialMuted = false,
}: {
  onChange: (volume: number, muted: boolean) => void;
  initialVolume?: number;
  initialMuted?: boolean;
}) {
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [showVolume, setShowVolume] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onChange(newVolume, newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    onChange(volume, !isMuted);
  };

  return (
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={() => setShowVolume(true)}
      onMouseLeave={() => setShowVolume(false)}
    >
      <button onClick={toggleMute} className="hover:text-primary transition-colors">
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div
        className={`flex items-center transition-all duration-200 ${
          showVolume ? 'w-24 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}
