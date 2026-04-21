'use client';

import { useRef, useState } from 'react';
import MediaMTXWebRTCPublisher from '@/lib/utils/mediamtx/webrtc';
import { Button } from '@/components/ui/button';

const HLS_COMPATIBLE_VIDEO_CODECS = [
  ['h264', 'h264/90000'],
  ['vp9', 'vp9/90000'],
  ['av1', 'av1/90000'],
  ['h265', 'h265/90000'],
] as const;

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publisherRef = useRef<MediaMTXWebRTCPublisher | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPublishing = async () => {
    try {
      setError(null);
      const videoCodec = await getPreferredVideoCodec();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      publisherRef.current = new MediaMTXWebRTCPublisher({
        url: 'http://localhost:8889/eth0/whip',
        stream,
        videoCodec,
        videoBitrate: 2000,
        audioCodec: 'opus',
        audioBitrate: 64,
        audioVoice: true,
        user: 'user',
        pass: '83ea0c36-57ff-4bc5-b6fe-f920b0e5d9d9',
        onConnected: () => {
          setIsPublishing(true);
        },
        onError: (message) => {
          setError(message);
          setIsPublishing(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start publishing');
    }
  };

  const stopPublishing = () => {
    publisherRef.current?.close();
    publisherRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsPublishing(false);
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-md bg-black"
      />

      <div className="flex gap-2">
        <Button onClick={startPublishing} disabled={isPublishing}>
          Start
        </Button>
        <Button onClick={stopPublishing} disabled={!isPublishing}>
          Stop
        </Button>
      </div>

      {error ? <p>{error}</p> : null}
    </div>
  );
}

async function getPreferredVideoCodec(): Promise<string> {
  const tempPc = new RTCPeerConnection();

  try {
    tempPc.addTransceiver('video', { direction: 'sendonly' });

    const offer = await tempPc.createOffer();
    const sdp = offer.sdp?.toLowerCase() ?? '';

    for (const [codec, needle] of HLS_COMPATIBLE_VIDEO_CODECS) {
      if (sdp.includes(needle)) {
        return codec;
      }
    }
  } finally {
    tempPc.close();
  }

  throw new Error(
    'This browser does not expose an HLS-compatible WebRTC video codec. MediaMTX HLS supports AV1, VP9, H265, and H264, but not VP8.'
  );
}
