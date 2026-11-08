import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import type {
  StreamHealthCheck,
  StreamHealthReport,
  StreamHealthStatus,
} from '#shared/types/streamHealth';
import { MEDIAMTX_SERVER_REGIONS } from './mediamtxServer';

// Turns what hctvmtx measures about a live stream (per-track stats added by the fork, plus
// SRT link stats) into checks a streamer can act on. Thresholds follow what the player and
// the streaming guide recommend: H.264, 2 s keyframes, no B-frames, 720p-1080p, 2-6 Mbps.

interface MtxTrack {
  codec: string;
  codecProps?: {
    width?: number;
    height?: number;
    sampleRate?: number;
    channelCount?: number;
  } | null;
  // hctvmtx extension
  stats?: {
    frameRate: number;
    bitrate: number;
    keyframeInterval: number;
    hasBFrames: boolean;
  } | null;
}

interface MtxPath {
  ready: boolean;
  source?: { type: string; id: string } | null;
  tracks2?: MtxTrack[];
}

interface MtxSRTConn {
  msRTT: number;
  packetsReceived: number;
  packetsReceivedDrop: number;
  packetsReceivedLossRate: number;
  msReceiveTsbPdDelay: number;
}

const VIDEO_CODECS = [
  'H264',
  'H265',
  'AV1',
  'VP9',
  'VP8',
  'MPEG-4 Video',
  'MPEG-1/2 Video',
  'M-JPEG',
];

const KEYFRAME_GOOD_SECONDS = 2.5;
const BITRATE_HIGH_KBPS = 6500;
const BITRATE_LOW_KBPS = 700;
const AUDIO_BITRATE_LOW_KBPS = 64;
const SRT_LOSS_WARN_PERCENT = 3;
const SRT_DROP_WARN_RATIO = 0.002;

const OUTPUT_STREAMING = ['Settings', 'Output', 'Streaming'];
const OUTPUT_ADVANCED_NOTE = "Switch Output Mode to Advanced if you don't see it.";

function formatKbps(bitsPerSecond: number) {
  const kbps = bitsPerSecond / 1000;
  // non-breaking spaces keep numbers and units on one line in narrow layouts
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)}\u00a0Mbps`;
  return `${Math.round(kbps).toLocaleString('en-US')}\u00a0Kbps`;
}

function formatSeconds(seconds: number) {
  const rounded = Math.round(seconds * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}\u00a0s`;
}

function codecName(codec: string) {
  switch (codec) {
    case 'H264':
      return 'H.264';
    case 'H265':
      return 'H.265';
    case 'MPEG-4 Audio':
      return 'AAC';
    default:
      return codec;
  }
}

function protocolOf(sourceType?: string): StreamHealthReport['protocol'] {
  if (!sourceType) return undefined;
  if (sourceType.startsWith('rtmp')) return 'RTMP';
  if (sourceType.startsWith('srt')) return 'SRT';
  if (sourceType.startsWith('webRTC')) return 'WebRTC';
  return 'Other';
}

function check(
  id: StreamHealthCheck['id'],
  label: string,
  value: string,
  status: StreamHealthStatus,
  problem: Pick<StreamHealthCheck, 'title' | 'message' | 'fix'> = {}
): StreamHealthCheck {
  return { id, label, value, status, ...problem };
}

function videoChecks(video: MtxTrack | undefined): StreamHealthCheck[] {
  if (!video) {
    return [
      check('videoCodec', 'Video', 'None', 'warn', {
        title: 'No video',
        message: 'Viewers only get your audio.',
        fix: {
          path: ['Sources'],
          text: 'Add a Display, Window or Video Capture source to your scene.',
        },
      }),
    ];
  }

  const stats = video.stats;
  const isMeasured = Boolean(stats && stats.frameRate > 0);
  const checks: StreamHealthCheck[] = [];

  // keyframes: the biggest single factor in HLS delay
  const keyframe = stats?.keyframeInterval ?? 0;
  if (keyframe <= 0) {
    checks.push(check('keyframes', 'Keyframes', 'Measuring…', 'pending'));
  } else if (keyframe <= KEYFRAME_GOOD_SECONDS) {
    checks.push(check('keyframes', 'Keyframes', `Every ${formatSeconds(keyframe)}`, 'good'));
  } else {
    checks.push(
      check('keyframes', 'Keyframes', `Every ${formatSeconds(keyframe)}`, 'warn', {
        title: `Keyframes every ${formatSeconds(keyframe)}`,
        message: `Viewers can only join on a keyframe, so they sit about ${formatSeconds(keyframe * 2)} behind you and wait longer for the picture to appear.`,
        fix: {
          path: OUTPUT_STREAMING,
          text: `Set Keyframe Interval to 2 s. ${OUTPUT_ADVANCED_NOTE}`,
        },
      })
    );
  }

  // B-frames: WebRTC (real-time) playback can't decode them
  if (video.codec === 'H264' || video.codec === 'H265') {
    if (stats?.hasBFrames) {
      checks.push(
        check('bframes', 'Real-time playback', 'Off', 'warn', {
          title: 'B-frames turn off real-time playback',
          message:
            "Browsers can't play B-frames in real time, so everyone gets the regular player, a few seconds further behind.",
          fix: {
            path: OUTPUT_STREAMING,
            text: 'Set B-frames to 0 (NVENC, QuickSync, AMF). With x264, set Tune to `zerolatency` or add `bframes=0` to x264 Options.',
          },
        })
      );
    } else if (!isMeasured) {
      checks.push(check('bframes', 'Real-time playback', 'Measuring…', 'pending'));
    } else {
      checks.push(check('bframes', 'Real-time playback', 'On', 'good'));
    }
  }

  // codec
  if (video.codec === 'H264') {
    checks.push(check('videoCodec', 'Video codec', 'H.264', 'good'));
  } else {
    checks.push(
      check('videoCodec', 'Video codec', codecName(video.codec), 'warn', {
        title: `${codecName(video.codec)} doesn't play everywhere`,
        message: `Lots of browsers, especially on phones and older laptops, can't play ${codecName(video.codec)}.`,
        fix: {
          path: OUTPUT_STREAMING,
          text: 'Pick an H.264 encoder: x264, NVENC H.264, QuickSync H.264, AMD H.264 or Apple VT H.264.',
        },
      })
    );
  }

  const height = video.codecProps?.height ?? 0;
  const width = video.codecProps?.width ?? 0;

  // bitrate
  const bitrate = stats?.bitrate ?? 0;
  if (bitrate <= 0) {
    checks.push(check('bitrate', 'Video bitrate', 'Measuring…', 'pending'));
  } else if (bitrate / 1000 > BITRATE_HIGH_KBPS) {
    checks.push(
      check('bitrate', 'Video bitrate', formatKbps(bitrate), 'warn', {
        title: `Bitrate is ${formatKbps(bitrate)}`,
        message:
          'Viewers on school or home wifi will buffer, and platforms you multistream to may cap or reject it.',
        fix: {
          path: OUTPUT_STREAMING,
          text: 'Set Bitrate to 2,500–4,500 Kbps. Code and text stay sharp well below this.',
        },
      })
    );
  } else if (bitrate / 1000 < BITRATE_LOW_KBPS && height >= 720) {
    checks.push(
      check('bitrate', 'Video bitrate', formatKbps(bitrate), 'tip', {
        title: `Bitrate is low for ${height}p`,
        message: 'Text and code can look blocky when things move.',
        fix: {
          path: OUTPUT_STREAMING,
          text: 'Raise Bitrate to around 2,500 Kbps, or lower the output resolution to 720p.',
        },
      })
    );
  } else {
    checks.push(check('bitrate', 'Video bitrate', formatKbps(bitrate), 'good'));
  }

  // frame rate
  const fps = stats?.frameRate ?? 0;
  if (fps <= 0) {
    checks.push(check('framerate', 'Frame rate', 'Measuring…', 'pending'));
  } else if (fps < 20) {
    checks.push(
      check('framerate', 'Frame rate', `${Math.round(fps)} fps`, 'warn', {
        title: `Only ${Math.round(fps)} fps`,
        message: 'Motion looks choppy. This usually means OBS or your encoder is overloaded.',
        fix: {
          path: ['Settings', 'Video'],
          text: 'Set Common FPS to 30, and check the OBS status bar for skipped frames. A hardware encoder or a lower output resolution helps.',
        },
      })
    );
  } else if (fps > 61) {
    checks.push(
      check('framerate', 'Frame rate', `${Math.round(fps)} fps`, 'tip', {
        title: `${Math.round(fps)} fps is more than viewers need`,
        message: 'Above 60 fps costs a lot of bandwidth for little gain on a screen share.',
        fix: { path: ['Settings', 'Video'], text: 'Set Common FPS to 30 or 60.' },
      })
    );
  } else {
    checks.push(check('framerate', 'Frame rate', `${Math.round(fps)} fps`, 'good'));
  }

  // resolution
  if (height > 0) {
    const value = `${width} × ${height}`;
    if (height > 1080) {
      checks.push(
        check('resolution', 'Resolution', value, 'tip', {
          title: `${height}p is more than viewers need`,
          message:
            'It costs viewers a lot of bandwidth, and small text often reads better at 1080p with a good bitrate.',
          fix: {
            path: ['Settings', 'Video'],
            text: 'Set Output (Scaled) Resolution to 1920×1080.',
          },
        })
      );
    } else if (height < 480) {
      checks.push(
        check('resolution', 'Resolution', value, 'tip', {
          title: `${height}p is hard to read`,
          message: 'Code and small text will be blurry.',
          fix: {
            path: ['Settings', 'Video'],
            text: 'Set Output (Scaled) Resolution to 1280×720 or higher.',
          },
        })
      );
    } else {
      checks.push(check('resolution', 'Resolution', value, 'good'));
    }
  }

  return checks;
}

function audioCheck(audio: MtxTrack | undefined): StreamHealthCheck {
  if (!audio) {
    return check('audio', 'Audio', 'None', 'warn', {
      title: 'No audio',
      message:
        "Viewers won't hear anything, and YouTube drops streams without audio if you multistream there.",
      fix: {
        path: ['Audio Mixer'],
        text: "Add a Mic/Aux or Desktop Audio source and make sure it isn't muted.",
      },
    });
  }

  const sampleRate = audio.codecProps?.sampleRate;
  const channels = audio.codecProps?.channelCount;
  const bitrate = audio.stats?.bitrate ?? 0;
  const value = [
    codecName(audio.codec),
    sampleRate ? `${sampleRate / 1000}\u00a0kHz` : undefined,
    channels === 1 ? 'mono' : undefined,
    bitrate > 0 ? formatKbps(bitrate) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  if (audio.codec !== 'MPEG-4 Audio' && audio.codec !== 'Opus') {
    return check('audio', 'Audio', value, 'tip', {
      title: `${codecName(audio.codec)} audio plays in fewer places`,
      message: "Some browsers and multistream platforms can't play it.",
      fix: { path: ['Settings', 'Output', 'Audio'], text: 'Use AAC, the OBS default.' },
    });
  }

  if (bitrate > 0 && bitrate / 1000 < AUDIO_BITRATE_LOW_KBPS) {
    return check('audio', 'Audio', value, 'tip', {
      title: `Audio bitrate is ${formatKbps(bitrate)}`,
      message: 'Your voice may sound muffled.',
      fix: { path: ['Settings', 'Output', 'Audio'], text: 'Set Audio Bitrate to 128 Kbps.' },
    });
  }

  return check('audio', 'Audio', value, 'good');
}

function connectionCheck(srt: MtxSRTConn): StreamHealthCheck {
  const loss = srt.packetsReceivedLossRate;
  const dropRatio = srt.packetsReceived > 0 ? srt.packetsReceivedDrop / srt.packetsReceived : 0;
  const value = `${Math.round(srt.msRTT)}\u00a0ms · ${loss.toFixed(1)}%\u00a0loss`;

  if (loss > SRT_LOSS_WARN_PERCENT || dropRatio > SRT_DROP_WARN_RATIO) {
    return check('connection', 'Connection', value, 'warn', {
      title: `Your connection is losing ${loss.toFixed(1)}% of packets`,
      message:
        'Viewers see glitches or freezes. SRT resends lost packets, but only within its buffer.',
      fix: {
        text: `Use a wired connection or lower your bitrate. You can also give SRT more buffer by adding \`&latency=1000000\` (1 s) to the end of your Server URL; it's ${Math.round(srt.msReceiveTsbPdDelay)} ms now.`,
      },
    });
  }

  return check('connection', 'Connection', value, 'good');
}

async function mtxGet<T>(region: string, path: string): Promise<T | null> {
  const envs = MEDIAMTX_SERVER_REGIONS[region as MediaMTXRegion];
  if (!envs) throw new Error(`unknown region ${region}`);

  const res = await fetch(`${envs.apiUrl}${path}`, {
    headers: envs.apiAuthHeader ? { Authorization: envs.apiAuthHeader } : {},
    signal: AbortSignal.timeout(3_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function getStreamHealth(
  channelName: string,
  region: string
): Promise<StreamHealthReport> {
  let path: MtxPath | null;
  try {
    path = await mtxGet<MtxPath>(region, `/v3/paths/get/${encodeURIComponent(channelName)}`);
  } catch (error) {
    console.error(`Stream health: failed to query ${region} for ${channelName}:`, error);
    return { isLive: true, error: "Couldn't reach the streaming server.", checks: [] };
  }

  if (!path?.ready) {
    return { isLive: false, checks: [] };
  }

  const tracks = path.tracks2 ?? [];
  const video = tracks.find((track) => VIDEO_CODECS.includes(track.codec));
  const audio = tracks.find((track) => track !== video);
  const protocol = protocolOf(path.source?.type);

  const checks = [...videoChecks(video), audioCheck(audio)];

  if (protocol === 'SRT' && path.source?.id) {
    const srt = await mtxGet<MtxSRTConn>(
      region,
      `/v3/srtconns/get/${encodeURIComponent(path.source.id)}`
    ).catch(() => null);
    if (srt) checks.push(connectionCheck(srt));
  }

  return {
    isLive: true,
    protocol,
    checks,
  };
}
