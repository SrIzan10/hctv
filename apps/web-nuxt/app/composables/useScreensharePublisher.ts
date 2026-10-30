import { getMediamtxClientEnvs } from '#shared/utils/mediamtx/client';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import MediaMTXWebRTCPublisher from '#shared/utils/mediamtx/webrtc';

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

// port of lib/hooks/useScreensharePublisher.ts; options may be refs/getters, state is returned as refs.
// Bind `previewRef` to the preview <video> (ref="previewRef" via a returned template ref).
export function useScreensharePublisher({
  channelName,
  region,
  streamKey,
}: UseScreensharePublisherOptions) {
  const previewRef = ref<HTMLVideoElement | null>(null);
  let captureStream: MediaStream | null = null;
  let captureCleanup: (() => void) | null = null;
  let publisher: MediaMTXWebRTCPublisher | null = null;
  const publishState = ref<PublishState>('idle');
  const hasPreview = ref(false);
  const issue = ref<PublisherIssue | null>(null);
  const browserWarning = ref<PublisherIssue | null>(null);

  onMounted(() => {
    browserWarning.value = getBrowserWarning();
  });

  function setPreviewStream(stream: MediaStream | null) {
    if (previewRef.value) {
      previewRef.value.srcObject = stream;
    }
  }

  // the <video> may mount after the stream was captured (v-if), so re-attach when it appears
  watch(previewRef, (el) => {
    if (el && captureStream) el.srcObject = captureStream;
  });

  function detachCaptureCleanup() {
    captureCleanup?.();
    captureCleanup = null;
  }

  function clearCaptureStream() {
    detachCaptureCleanup();
    stopTracks(captureStream);
    captureStream = null;
    hasPreview.value = false;
    setPreviewStream(null);
  }

  function closePublisher() {
    const current = publisher;
    publisher = null;
    current?.close();
  }

  function disposeCurrentSession() {
    closePublisher();
    clearCaptureStream();
  }

  function stopPublishing() {
    disposeCurrentSession();
    issue.value = null;
    publishState.value = 'idle';
  }

  function attachCaptureStopListener(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks();

    if (!videoTrack) {
      captureCleanup = null;
      return;
    }

    const handleEnded = () => {
      stopPublishing();
    };

    videoTrack.addEventListener('ended', handleEnded);
    captureCleanup = () => {
      videoTrack.removeEventListener('ended', handleEnded);
    };
  }

  function commitCaptureStream(nextStream: MediaStream) {
    const previousStream = captureStream;

    detachCaptureCleanup();
    captureStream = nextStream;
    hasPreview.value = true;
    setPreviewStream(nextStream);
    attachCaptureStopListener(nextStream);
    stopTracks(previousStream);
  }

  async function previewSource() {
    try {
      issue.value = null;
      publishState.value = 'previewing';

      const stream = await requestCaptureStream();

      commitCaptureStream(stream);
      publishState.value = 'preview';
    } catch (err) {
      publishState.value = captureStream ? 'preview' : 'idle';
      issue.value = classifyPublisherIssue(err, 'preview');
    }
  }

  async function startPublishing() {
    const channel = toValue(channelName);
    const key = toValue(streamKey);

    if (!channel) {
      issue.value = {
        context: 'start',
        description: 'Pick a channel first so we know where to publish.',
        title: 'Choose a channel before starting',
        tone: 'warning',
      };
      return;
    }

    if (!key) {
      issue.value = {
        context: 'start',
        description: 'Wait for the stream key to load, then try starting again.',
        title: 'Stream key is still unavailable',
        tone: 'warning',
      };
      return;
    }

    try {
      issue.value = null;
      publishState.value = 'connecting';

      const videoCodec = await getPreferredVideoCodec();
      let stream = captureStream;

      if (!stream) {
        stream = await requestCaptureStream();
        commitCaptureStream(stream);
      }

      const next: MediaMTXWebRTCPublisher = new MediaMTXWebRTCPublisher({
        url: getWhipUrl(channel, toValue(region)),
        stream,
        videoCodec,
        videoBitrate: 2000,
        audioCodec: 'opus',
        audioBitrate: 64,
        audioVoice: true,
        user: 'user',
        pass: key,
        onConnected: () => {
          if (publisher !== next) {
            return;
          }

          publishState.value = 'live';
        },
        onError: (message) => {
          if (publisher !== next) {
            return;
          }

          issue.value = classifyPublisherIssue(message, 'publish');
          publishState.value = 'connecting';
        },
      });

      publisher = next;
    } catch (err) {
      closePublisher();
      publishState.value = captureStream ? 'preview' : 'idle';
      issue.value = classifyPublisherIssue(err, 'start');
    }
  }

  async function changeSource() {
    const current = publisher;

    if (!current) {
      return;
    }

    let nextStream: MediaStream | null = null;

    try {
      issue.value = null;
      publishState.value = 'switching';

      nextStream = await requestCaptureStream();
      await current.replaceStream(nextStream);
      commitCaptureStream(nextStream);
      publishState.value = 'live';
    } catch (err) {
      stopTracks(nextStream);
      publishState.value = publisher ? 'live' : 'idle';
      issue.value = classifyPublisherIssue(err, 'switch');
    }
  }

  onBeforeUnmount(() => {
    disposeCurrentSession();
  });

  return {
    browserWarning,
    changeSource,
    hasPreview,
    issue,
    isLive: computed(() => publishState.value === 'live'),
    isPreviewReady: computed(() => publishState.value === 'preview'),
    isPreviewingSource: computed(() => publishState.value === 'previewing'),
    isSessionActive: computed(
      () =>
        publishState.value === 'connecting' ||
        publishState.value === 'live' ||
        publishState.value === 'switching'
    ),
    isStarting: computed(() => publishState.value === 'connecting'),
    isSwitchingSource: computed(() => publishState.value === 'switching'),
    publishState,
    previewRef,
    previewSource,
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
    context === 'switch'
      ? 'Failed to change screenshare source'
      : context === 'preview'
        ? 'Failed to preview the selected source'
        : 'Failed to start publishing'
  );
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('notallowederror') || normalizedMessage.includes('permission')) {
    return {
      context,
      description:
        context === 'switch'
          ? 'Choose a new tab, window, or display in the browser picker to continue the broadcast.'
          : context === 'preview'
            ? 'Approve the browser screen-share prompt so we can load your preview.'
            : 'Approve the browser screen-share prompt, then try again.',
      title:
        context === 'switch'
          ? 'Source switch was cancelled or blocked'
          : context === 'preview'
            ? 'Preview permission was denied'
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
        'Use the platform over HTTPS or localhost in a Chromium-based browser, then try again.',
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
        : context === 'preview'
          ? 'Try choosing the source again. If it keeps failing, reload the page or switch browsers.'
          : 'Try again. If it keeps failing, switch servers or reload the page.',
    title:
      context === 'switch'
        ? 'Could not switch the shared source'
        : context === 'preview'
          ? 'Could not load the preview'
          : 'Could not start the stream',
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

type PublishState = 'idle' | 'previewing' | 'preview' | 'connecting' | 'live' | 'switching';

type UseScreensharePublisherOptions = {
  channelName: MaybeRefOrGetter<string | undefined>;
  region: MaybeRefOrGetter<MediaMTXRegion>;
  streamKey?: MaybeRefOrGetter<string | null | undefined>;
};

type PublisherIssue = {
  context: PublisherIssueContext;
  description: string;
  title: string;
  tone: 'warning' | 'destructive';
};

type PublisherIssueContext = 'preview' | 'publish' | 'start' | 'switch' | 'warning';

type ScreenCaptureOptions = DisplayMediaStreamOptions & {
  monitorTypeSurfaces?: 'include' | 'exclude';
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
};
