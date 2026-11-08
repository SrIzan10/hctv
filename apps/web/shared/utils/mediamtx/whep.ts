// Minimal WHEP (WebRTC playback) client for MediaMTX. Unlike the publisher next door it never
// restarts itself: any failure is reported once through onFailed and the player falls back to HLS.

// the first viewers of a stream get sub-second WebRTC straight from the origin; past this, new
// viewers go through HLS and the CDN edge. the MediaMTX auth hook enforces it, the client only
// uses it to skip a WebRTC attempt that would be refused anyway.
export const WEBRTC_MAX_VIEWERS = 5;

const ICE_GATHERING_TIMEOUT_MS = 2000;
// `disconnected` can recover on its own (brief network blips), `failed` cannot
const DISCONNECTED_GRACE_MS = 4000;

export type WhepReaderConfig = {
  url: string;
  user?: string;
  pass?: string;
  onTrack: (stream: MediaStream) => void;
  onFailed: (reason: string) => void;
};

export class WhepReader {
  private readonly conf: WhepReaderConfig;
  private pc: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;
  private isClosed = false;
  private disconnectedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(conf: WhepReaderConfig) {
    this.conf = conf;
    void this.start().catch((err: unknown) => {
      this.fail(err instanceof Error ? err.message : String(err));
    });
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined';
  }

  close = (): void => {
    if (this.isClosed) return;
    this.isClosed = true;
    this.clearDisconnectedTimer();

    this.pc?.close();
    this.pc = null;
    this.deleteSession();
  };

  // free the reader slot right away instead of waiting for MediaMTX to time the session out
  private deleteSession() {
    if (!this.sessionUrl) return;
    void fetch(this.sessionUrl, {
      method: 'DELETE',
      headers: this.authHeaders(),
      keepalive: true,
    }).catch(() => {});
    this.sessionUrl = null;
  }

  // raw WebRTC stats of the connection, for the player's stats overlay
  getStats = async (): Promise<RTCStatsReport | null> => {
    return this.pc ? this.pc.getStats() : null;
  };

  private authHeaders(): Record<string, string> {
    if (this.conf.user === undefined && this.conf.pass === undefined) return {};
    return { Authorization: `Basic ${btoa(`${this.conf.user ?? ''}:${this.conf.pass ?? ''}`)}` };
  }

  private fail(reason: string) {
    if (this.isClosed) return;
    this.close();
    this.conf.onFailed(reason);
  }

  private clearDisconnectedTimer() {
    if (this.disconnectedTimer) {
      clearTimeout(this.disconnectedTimer);
      this.disconnectedTimer = null;
    }
  }

  private async start() {
    const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
    this.pc = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const stream = new MediaStream();
    let hasEmittedStream = false;
    pc.ontrack = (event) => {
      stream.addTrack(event.track);
      if (!hasEmittedStream) {
        hasEmittedStream = true;
        this.conf.onTrack(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.isClosed) return;
      switch (pc.connectionState) {
        case 'failed':
          this.fail('peer connection failed');
          break;
        case 'disconnected':
          this.clearDisconnectedTimer();
          this.disconnectedTimer = setTimeout(() => {
            if (pc.connectionState === 'disconnected') this.fail('peer connection lost');
          }, DISCONNECTED_GRACE_MS);
          break;
        case 'connected':
          this.clearDisconnectedTimer();
          break;
      }
    };

    await pc.setLocalDescription(await pc.createOffer());
    // non-trickle: send the offer once candidates are in, which saves the PATCH round trips
    await waitForIceGathering(pc);
    if (this.isClosed) return;

    const res = await fetch(this.conf.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp', ...this.authHeaders() },
      body: pc.localDescription?.sdp ?? '',
    });

    if (res.status !== 201) {
      // 401 here is the auth hook saying no, which includes the WebRTC viewer cap being full
      throw new Error(`whep ${res.status}`);
    }

    const location = res.headers.get('Location');
    if (location) {
      this.sessionUrl = new URL(location, this.conf.url).toString();
    }

    const answer = await res.text();
    if (this.isClosed) {
      // closed while the POST was in flight, so close() couldn't know the session yet
      this.deleteSession();
      return;
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });

    // WebRTC can't carry AAC, which is what OBS sends by default. hctvmtx's transcode image
    // converts it to Opus, but when that isn't possible (a stock MediaMTX, or multichannel AAC)
    // MediaMTX answers with a placeholder PCMU track that never sends a packet (it only exists so
    // browsers show the video), and the viewer would get a silent stream. HLS carries AAC fine,
    // so go there instead.
    if (!hasRealAudio(answer)) {
      throw new Error('no_audio');
    }
  }
}

// true when the answer's audio section is live and isn't MediaMTX's silent PCMU/8000 placeholder
function hasRealAudio(sdp: string): boolean {
  const sections = sdp.split(/\r?\n(?=m=)/);
  return sections.some(
    (section) =>
      /^m=audio [1-9]/.test(section) &&
      !/^a=inactive\s*$/m.test(section) &&
      /^a=rtpmap:\d+ /m.test(section) &&
      !/^a=rtpmap:\d+ PCMU\/8000\s*$/im.test(section)
  );
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(done, ICE_GATHERING_TIMEOUT_MS);
    function done() {
      clearTimeout(timeout);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    function onChange() {
      if (pc.iceGatheringState === 'complete') done();
    }
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}
