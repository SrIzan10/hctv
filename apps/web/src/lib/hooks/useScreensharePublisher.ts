'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';
import MediaMTXWebRTCPublisher from '@/lib/utils/mediamtx/webrtc';

const HLS_COMPATIBLE_VIDEO_CODECS = [
  ['h264', 'h264/90000'],
  ['vp9', 'vp9/90000'],
  ['av1', 'av1/90000'],
  ['h265', 'h265/90000'],
] as const;

const DISPLAY_MEDIA_OPTIONS: ScreenCaptureOptions = {
  video: true,
  audio: true,
  monitorTypeSurfaces: 'include',
  selfBrowserSurface: 'exclude',
  surfaceSwitching: 'include',
  systemAudio: 'include',
};

export function useScreensharePublisher({
  channelName,
  region,
  streamKey,
}: UseScreensharePublisherOptions) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const captureCleanupRef = useRef<(() => void) | null>(null);
  const publisherRef = useRef<MediaMTXWebRTCPublisher | null>(null);
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [issue, setIssue] = useState<PublisherIssue | null>(null);
  const browserWarning = useMemo(() => getBrowserWarning(), []);

  const setPreviewStream = useCallback((stream: MediaStream | null) => {
    if (previewRef.current) {
      previewRef.current.srcObject = stream;
    }
  }, []);

  const detachCaptureCleanup = useCallback(() => {
    captureCleanupRef.current?.();
    captureCleanupRef.current = null;
  }, []);

  const clearCaptureStream = useCallback(() => {
    detachCaptureCleanup();
    stopTracks(captureStreamRef.current);
    captureStreamRef.current = null;
    setPreviewStream(null);
  }, [detachCaptureCleanup, setPreviewStream]);

  const closePublisher = useCallback(() => {
    const publisher = publisherRef.current;

    publisherRef.current = null;
    publisher?.close();
  }, []);

  const disposeCurrentSession = useCallback(() => {
    closePublisher();
    clearCaptureStream();
  }, [clearCaptureStream, closePublisher]);

  const stopPublishing = useCallback(() => {
    disposeCurrentSession();
    setIssue(null);
    setPublishState('idle');
  }, [disposeCurrentSession]);

  const attachCaptureStopListener = useCallback(
    (stream: MediaStream) => {
      const [videoTrack] = stream.getVideoTracks();

      if (!videoTrack) {
        captureCleanupRef.current = null;
        return;
      }

      const handleEnded = () => {
        stopPublishing();
      };

      videoTrack.addEventListener('ended', handleEnded);
      captureCleanupRef.current = () => {
        videoTrack.removeEventListener('ended', handleEnded);
      };
    },
    [stopPublishing]
  );

  const commitCaptureStream = useCallback(
    (nextStream: MediaStream) => {
      const previousStream = captureStreamRef.current;

      detachCaptureCleanup();
      captureStreamRef.current = nextStream;
      setPreviewStream(nextStream);
      attachCaptureStopListener(nextStream);
      stopTracks(previousStream);
    },
    [attachCaptureStopListener, detachCaptureCleanup, setPreviewStream]
  );

  const startPublishing = useCallback(async () => {
    if (!channelName) {
      setIssue({
        context: 'start',
        description: 'Pick a channel first so we know where to publish.',
        title: 'Choose a channel before starting',
        tone: 'warning',
      });
      return;
    }

    if (!streamKey) {
      setIssue({
        context: 'start',
        description: 'Wait for the stream key to load, then try starting again.',
        title: 'Stream key is still unavailable',
        tone: 'warning',
      });
      return;
    }

    try {
      setIssue(null);
      setPublishState('connecting');

      const videoCodec = await getPreferredVideoCodec();
      const stream = await requestCaptureStream();

      commitCaptureStream(stream);

      const publisher = new MediaMTXWebRTCPublisher({
        url: getWhipUrl(channelName, region),
        stream,
        videoCodec,
        videoBitrate: 2000,
        audioCodec: 'opus',
        audioBitrate: 64,
        audioVoice: true,
        user: 'user',
        pass: streamKey,
        onConnected: () => {
          if (publisherRef.current !== publisher) {
            return;
          }

          setPublishState('live');
        },
        onError: (message) => {
          if (publisherRef.current !== publisher) {
            return;
          }

          setIssue(classifyPublisherIssue(message, 'publish'));
          setPublishState('connecting');
        },
      });

      publisherRef.current = publisher;
    } catch (err) {
      disposeCurrentSession();
      setPublishState('idle');
      setIssue(classifyPublisherIssue(err, 'start'));
    }
  }, [channelName, commitCaptureStream, disposeCurrentSession, region, streamKey]);

  const changeSource = useCallback(async () => {
    const publisher = publisherRef.current;

    if (!publisher) {
      return;
    }

    let nextStream: MediaStream | null = null;

    try {
      setIssue(null);
      setPublishState('switching');

      nextStream = await requestCaptureStream();
      await publisher.replaceStream(nextStream);
      commitCaptureStream(nextStream);
      setPublishState('live');
    } catch (err) {
      stopTracks(nextStream);
      setPublishState(publisherRef.current ? 'live' : 'idle');
      setIssue(classifyPublisherIssue(err, 'switch'));
    }
  }, [commitCaptureStream]);

  useEffect(() => {
    return () => {
      disposeCurrentSession();
    };
  }, [disposeCurrentSession]);

  return {
    browserWarning,
    changeSource,
    issue,
    isLive: publishState === 'live',
    isSessionActive: publishState !== 'idle',
    isStarting: publishState === 'connecting',
    isSwitchingSource: publishState === 'switching',
    publishState,
    previewRef,
    startPublishing,
    stopPublishing,
  };
}

async function requestCaptureStream() {
  return navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS as DisplayMediaStreamOptions);
}

function getWhipUrl(channelName: string, region: MediaMTXRegion) {
  const { whip } = getMediamtxClientEnvs(region);

  return `${whip.replace(/\/$/, '')}/${encodeURIComponent(channelName)}/whip`;
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function classifyPublisherIssue(error: unknown, context: PublisherIssueContext): PublisherIssue {
  const message = getErrorMessage(
    error,
    context === 'switch' ? 'Failed to change screenshare source' : 'Failed to start publishing'
  );
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('notallowederror') || normalizedMessage.includes('permission')) {
    return {
      context,
      description:
        context === 'switch'
          ? 'Choose a new tab, window, or display in the browser picker to continue the broadcast.'
          : 'Approve the browser screen-share prompt, then try again.',
      title:
        context === 'switch'
          ? 'Source switch was cancelled or blocked'
          : 'Screen-share permission was denied',
      tone: 'warning',
    };
  }

  if (normalizedMessage.includes('notfounderror')) {
    return {
      context,
      description:
        'Open the window or tab you want to capture, then retry the screen-share picker.',
      title: 'No capturable source was found',
      tone: 'warning',
    };
  }

  if (
    normalizedMessage.includes('getdisplaymedia') ||
    normalizedMessage.includes('secure context') ||
    normalizedMessage.includes('browser environment')
  ) {
    return {
      context,
      description:
        'Use HackClub.tv over HTTPS or localhost in a Chromium-based browser, then try again.',
      title: 'This browser or page cannot start screen sharing',
      tone: 'destructive',
    };
  }

  if (normalizedMessage.includes('hls-compatible webrtc video codec')) {
    return {
      context,
      description:
        'Switch to a Chromium-based browser. Firefox and Safari can expose codecs that our ingest pipeline cannot use reliably yet.',
      title: 'This browser cannot publish a compatible stream codec',
      tone: 'destructive',
    };
  }

  if (normalizedMessage.includes('invalid stream key') || normalizedMessage.includes('403')) {
    return {
      context,
      description:
        'Refresh the page or regenerate the stream key in channel settings if this keeps happening.',
      title: 'The ingest server rejected your stream key',
      tone: 'destructive',
    };
  }

  if (normalizedMessage.includes('404')) {
    return {
      context,
      description:
        'The selected ingest server may be misconfigured or offline. Try another server or retry in a moment.',
      title: 'The selected ingest server could not be reached',
      tone: 'destructive',
    };
  }

  if (normalizedMessage.includes('retrying in some seconds')) {
    return {
      context,
      description:
        'We are retrying automatically. Keep this page open, or stop and start again if it does not recover.',
      title: 'Connection to the ingest server dropped',
      tone: 'warning',
    };
  }

  return {
    context,
    description:
      context === 'switch'
        ? 'Try choosing the source again. If it keeps failing, stop the stream and start a new session.'
        : 'Try again. If it keeps failing, switch servers or reload the page.',
    title:
      context === 'switch' ? 'Could not switch the shared source' : 'Could not start the stream',
    tone: 'destructive',
  };
}

function getBrowserWarning(): PublisherIssue | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isChromium =
    userAgent.includes('chrome') || userAgent.includes('chromium') || userAgent.includes('edg/');

  if (isChromium) {
    return null;
  }

  return {
    context: 'warning',
    description:
      'You can still try this here, but screen capture and source switching are most reliable in Chrome or another Chromium-based browser.',
    title: 'This browser is supported on a best-effort basis',
    tone: 'warning',
  };
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

type PublishState = 'idle' | 'connecting' | 'live' | 'switching';

type UseScreensharePublisherOptions = {
  channelName: string;
  region: MediaMTXRegion;
  streamKey?: string | null;
};

type PublisherIssue = {
  context: PublisherIssueContext;
  description: string;
  title: string;
  tone: 'warning' | 'destructive';
};

type PublisherIssueContext = 'publish' | 'start' | 'switch' | 'warning';

type ScreenCaptureOptions = DisplayMediaStreamOptions & {
  monitorTypeSurfaces?: 'include' | 'exclude';
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
};
