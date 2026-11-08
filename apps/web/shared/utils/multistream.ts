// Multistreaming: forwarding a live channel to other platforms through hctvmtx's
// on-demand forward-dests API. Shared by the settings UI and the server reconciler.

export const MULTISTREAM_PLATFORMS = ['youtube', 'twitch', 'kick', 'custom'] as const;
export type MultistreamPlatform = (typeof MULTISTREAM_PLATFORMS)[number];

export const MAX_MULTISTREAM_DESTINATIONS = 5;

export interface MultistreamPlatformMeta {
  label: string;
  // prefilled server URL; empty when every account gets its own (Kick) or for custom
  defaultServer: string;
  serverHint: string;
  keyHint: string;
  isKeyRequired: boolean;
}

export const MULTISTREAM_PLATFORM_META: Record<MultistreamPlatform, MultistreamPlatformMeta> = {
  youtube: {
    label: 'YouTube',
    // YouTube's rtmps endpoint has served an invalid certificate before (see hctvmtx forward docs),
    // so plain rtmp is the safe default
    defaultServer: 'rtmp://a.rtmp.youtube.com/live2',
    serverHint: 'YouTube Studio, Go live, Stream settings, Stream URL.',
    keyHint: 'YouTube Studio, Go live, Stream settings, Stream key.',
    isKeyRequired: true,
  },
  twitch: {
    label: 'Twitch',
    defaultServer: 'rtmps://ingest.global-contribute.live-video.net/app',
    serverHint: 'Leave the default unless you want a specific Twitch ingest server.',
    keyHint: 'Twitch Creator Dashboard, Settings, Stream, Primary stream key.',
    isKeyRequired: true,
  },
  kick: {
    label: 'Kick',
    defaultServer: '',
    serverHint: 'Kick Creator Dashboard, Settings, Stream key, Stream URL.',
    keyHint: 'Kick Creator Dashboard, Settings, Stream key.',
    isKeyRequired: true,
  },
  custom: {
    label: 'Custom',
    defaultServer: '',
    serverHint: 'An rtmp://, rtmps://, srt://, rtsp:// or whip(s):// URL.',
    keyHint: 'Appended as the RTMP stream key, or sent as the WHIP bearer token. Optional.',
    isKeyRequired: false,
  },
};

export const MULTISTREAM_SCHEMES = ['rtmp', 'rtmps', 'srt', 'rtsp', 'rtsps', 'whip', 'whips'];

export function isMultistreamPlatform(value: string): value is MultistreamPlatform {
  return (MULTISTREAM_PLATFORMS as readonly string[]).includes(value);
}

export function getUrlScheme(url: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\//i.exec(url.trim());
  return match ? match[1]!.toLowerCase() : null;
}

// the stream key is secret, so only its tail goes back to the browser
export function maskStreamKey(key: string): string {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}
