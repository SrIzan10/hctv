// payload of /api/stream/health

// good: nothing to do. warn: worth fixing, viewers notice it. tip: optional improvement.
// pending: not measured yet (the first few seconds of a stream).
export type StreamHealthStatus = 'good' | 'warn' | 'tip' | 'pending';

export type StreamHealthCheckId =
  | 'keyframes'
  | 'bframes'
  | 'videoCodec'
  | 'bitrate'
  | 'framerate'
  | 'resolution'
  | 'audio'
  | 'connection';

export interface StreamHealthFix {
  // where the setting lives in OBS, e.g. ['Settings', 'Output', 'Streaming']
  path?: string[];
  // what to change there
  text: string;
}

export interface StreamHealthCheck {
  id: StreamHealthCheckId;
  // short name, shown on passing checks: "Keyframes"
  label: string;
  // what was measured: "Every 10 s", "1920 × 1080"
  value: string;
  status: StreamHealthStatus;
  // the problem as a sentence, shown when the status isn't good: "Keyframes every 10 s"
  title?: string;
  // why it matters
  message?: string;
  fix?: StreamHealthFix;
}

export interface StreamHealthReport {
  isLive: boolean;
  // set when the media server couldn't be asked, so the UI doesn't claim everything is fine
  error?: string;
  protocol?: 'RTMP' | 'SRT' | 'WebRTC' | 'Other';
  checks: StreamHealthCheck[];
}
