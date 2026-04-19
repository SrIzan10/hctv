// based off https://github.com/bluenviron/mediamtx/blob/v1.17.1/internal/servers/webrtc/publisher.js
// modified by codex to typescript
type OnError = (err: string) => void;
type OnConnected = () => void;

type PublisherState = 'running' | 'restarting' | 'closed';

type PublisherConfig = {
  url: string;
  user?: string;
  pass?: string;
  token?: string;
  stream: MediaStream;
  videoCodec: string;
  videoBitrate: number;
  audioCodec: string;
  audioBitrate: number;
  audioVoice: boolean;
  onError?: OnError;
  onConnected?: OnConnected;
};

type OfferData = {
  iceUfrag: string;
  icePwd: string;
  medias: string[];
};

type ParsedIceServer = RTCIceServer & {
  credentialType?: 'password';
};

interface Window {
  MediaMTXWebRTCPublisher: typeof MediaMTXWebRTCPublisher;
}

/** WebRTC/WHIP publisher. */
class MediaMTXWebRTCPublisher {
  private readonly retryPause = 2000;
  private readonly conf: PublisherConfig;
  private state: PublisherState = 'running';
  private restartTimeout: number | null = null;
  private pc: RTCPeerConnection | null = null;
  private offerData: OfferData | null = null;
  private sessionUrl: string | null = null;
  private queuedCandidates: RTCIceCandidate[] = [];

  constructor(conf: PublisherConfig) {
    this.conf = conf;
    this.start();
  }

  close = (): void => {
    this.state = 'closed';

    if (this.pc !== null) {
      this.pc.close();
    }

    if (this.restartTimeout !== null) {
      window.clearTimeout(this.restartTimeout);
    }
  };

  static #unquoteCredential(value: string): string {
    return JSON.parse(`"${value}"`) as string;
  }

  static #linkToIceServers(links: string | null): ParsedIceServer[] {
    if (links === null) {
      return [];
    }

    return links.split(', ').flatMap((link) => {
      const match = link.match(
        /^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i
      );

      if (!match) {
        return [];
      }

      const iceServer: ParsedIceServer = {
        urls: [match[1]],
      };

      if (match[3] !== undefined && match[4] !== undefined) {
        iceServer.username = this.#unquoteCredential(match[3]);
        iceServer.credential = this.#unquoteCredential(match[4]);
        iceServer.credentialType = 'password';
      }

      return [iceServer];
    });
  }

  static #parseOffer(offer: string): OfferData {
    const parsedOffer: OfferData = {
      iceUfrag: '',
      icePwd: '',
      medias: [],
    };

    for (const line of offer.split('\r\n')) {
      if (line.startsWith('m=')) {
        parsedOffer.medias.push(line.slice('m='.length));
      } else if (parsedOffer.iceUfrag === '' && line.startsWith('a=ice-ufrag:')) {
        parsedOffer.iceUfrag = line.slice('a=ice-ufrag:'.length);
      } else if (parsedOffer.icePwd === '' && line.startsWith('a=ice-pwd:')) {
        parsedOffer.icePwd = line.slice('a=ice-pwd:'.length);
      }
    }

    return parsedOffer;
  }

  static #generateSdpFragment(
    offerData: OfferData,
    candidates: RTCIceCandidate[]
  ): string {
    const candidatesByMedia: Record<number, RTCIceCandidate[]> = {};

    for (const candidate of candidates) {
      const mid = candidate.sdpMLineIndex;
      if (mid === null) {
        continue;
      }

      if (candidatesByMedia[mid] === undefined) {
        candidatesByMedia[mid] = [];
      }
      candidatesByMedia[mid].push(candidate);
    }

    let fragment = `a=ice-ufrag:${offerData.iceUfrag}\r\n`
      + `a=ice-pwd:${offerData.icePwd}\r\n`;

    let mid = 0;

    for (const media of offerData.medias) {
      if (candidatesByMedia[mid] !== undefined) {
        fragment += `m=${media}\r\n`
          + `a=mid:${mid}\r\n`;

        for (const candidate of candidatesByMedia[mid]) {
          fragment += `a=${candidate.candidate}\r\n`;
        }
      }
      mid++;
    }

    return fragment;
  }

  static #setCodec(section: string, codec: string): string {
    const normalizedCodec = codec.toLowerCase();
    const lines = section.split('\r\n');
    const filteredLines: string[] = [];
    const payloadFormats: string[] = [];

    for (const line of lines) {
      if (!line.startsWith('a=rtpmap:')) {
        filteredLines.push(line);
      } else if (line.toLowerCase().includes(normalizedCodec)) {
        payloadFormats.push(line.slice('a=rtpmap:'.length).split(' ')[0]);
        filteredLines.push(line);
      }
    }

    const rewrittenLines: string[] = [];
    let firstLine = true;

    for (const line of filteredLines) {
      if (firstLine) {
        firstLine = false;
        rewrittenLines.push(line.split(' ').slice(0, 3).concat(payloadFormats).join(' '));
      } else if (line.startsWith('a=fmtp:')) {
        if (payloadFormats.includes(line.slice('a=fmtp:'.length).split(' ')[0])) {
          rewrittenLines.push(line);
        }
      } else if (line.startsWith('a=rtcp-fb:')) {
        if (payloadFormats.includes(line.slice('a=rtcp-fb:'.length).split(' ')[0])) {
          rewrittenLines.push(line);
        }
      } else {
        rewrittenLines.push(line);
      }
    }

    return rewrittenLines.join('\r\n');
  }

  static #setVideoBitrate(section: string, bitrate: number): string {
    let lines = section.split('\r\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('c=')) {
        lines = [
          ...lines.slice(0, i + 1),
          `b=TIAS:${(bitrate * 1024).toString()}`,
          ...lines.slice(i + 1),
        ];
        break;
      }
    }

    return lines.join('\r\n');
  }

  static #setAudioBitrate(section: string, bitrate: number, voice: boolean): string {
    let opusPayloadFormat = '';
    const lines = section.split('\r\n');

    for (const line of lines) {
      if (line.startsWith('a=rtpmap:') && line.toLowerCase().includes('opus/')) {
        opusPayloadFormat = line.slice('a=rtpmap:'.length).split(' ')[0];
        break;
      }
    }

    if (opusPayloadFormat === '') {
      return section;
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`a=fmtp:${opusPayloadFormat} `)) {
        if (voice) {
          lines[i] =
            `a=fmtp:${opusPayloadFormat} minptime=10;useinbandfec=1;maxaveragebitrate=${(bitrate * 1024).toString()}`;
        } else {
          lines[i] =
            `a=fmtp:${opusPayloadFormat} maxplaybackrate=48000;stereo=1;sprop-stereo=1;maxaveragebitrate=${(bitrate * 1024).toString()}`;
        }
      }
    }

    return lines.join('\r\n');
  }

  static #editOffer(
    sdp: string,
    videoCodec: string,
    audioCodec: string,
    audioBitrate: number,
    audioVoice: boolean
  ): string {
    const sections = sdp.split('m=');

    for (let i = 0; i < sections.length; i++) {
      if (sections[i].startsWith('video')) {
        sections[i] = this.#setCodec(sections[i], videoCodec);
      } else if (sections[i].startsWith('audio')) {
        sections[i] = this.#setAudioBitrate(
          this.#setCodec(sections[i], audioCodec),
          audioBitrate,
          audioVoice
        );
      }
    }

    return sections.join('m=');
  }

  static #editAnswer(sdp: string, videoBitrate: number): string {
    const sections = sdp.split('m=');

    for (let i = 0; i < sections.length; i++) {
      if (sections[i].startsWith('video')) {
        sections[i] = this.#setVideoBitrate(sections[i], videoBitrate);
      }
    }

    return sections.join('m=');
  }

  private async start(): Promise<void> {
    try {
      const iceServers = await this.requestIceServers();
      const offer = await this.setupPeerConnection(iceServers);
      const answer = await this.sendOffer(offer);
      await this.setAnswer(answer);
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : String(error));
    }
  }

  private handleError(err: string): void {
    if (this.state === 'running') {
      if (this.pc !== null) {
        this.pc.close();
        this.pc = null;
      }

      this.offerData = null;

      if (this.sessionUrl !== null) {
        void fetch(this.sessionUrl, {
          method: 'DELETE',
        });
        this.sessionUrl = null;
      }

      this.queuedCandidates = [];
      this.state = 'restarting';

      this.restartTimeout = window.setTimeout(() => {
        this.restartTimeout = null;
        this.state = 'running';
        void this.start();
      }, this.retryPause);

      this.conf.onError?.(`${err}, retrying in some seconds`);
    }
  }

  private authHeader(): HeadersInit {
    if (this.conf.user !== undefined && this.conf.user !== '') {
      const credentials = btoa(`${this.conf.user}:${this.conf.pass ?? ''}`);
      return { Authorization: `Basic ${credentials}` };
    }
    if (this.conf.token !== undefined && this.conf.token !== '') {
      return { Authorization: `Bearer ${this.conf.token}` };
    }
    return {};
  }

  private async requestIceServers(): Promise<ParsedIceServer[]> {
    const response = await fetch(this.conf.url, {
      method: 'OPTIONS',
      headers: {
        ...this.authHeader(),
      },
    });

    return MediaMTXWebRTCPublisher.#linkToIceServers(response.headers.get('Link'));
  }

  private async setupPeerConnection(iceServers: RTCIceServer[]): Promise<string> {
    if (this.state !== 'running') {
      throw new Error('closed');
    }

    this.pc = new RTCPeerConnection({
      iceServers,
    });

    this.pc.onicecandidate = (event) => this.onLocalCandidate(event);
    this.pc.onconnectionstatechange = () => this.onConnectionState();

    this.conf.stream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.conf.stream);
    });

    const offer = await this.pc.createOffer();
    if (!offer.sdp) {
      throw new Error('missing offer SDP');
    }

    this.offerData = MediaMTXWebRTCPublisher.#parseOffer(offer.sdp);
    await this.pc.setLocalDescription(offer);

    return offer.sdp;
  }

  private async sendOffer(offer: string): Promise<string> {
    if (this.state !== 'running') {
      throw new Error('closed');
    }

    const editedOffer = MediaMTXWebRTCPublisher.#editOffer(
      offer,
      this.conf.videoCodec,
      this.conf.audioCodec,
      this.conf.audioBitrate,
      this.conf.audioVoice
    );

    const response = await fetch(this.conf.url, {
      method: 'POST',
      headers: {
        ...this.authHeader(),
        'Content-Type': 'application/sdp',
      },
      body: editedOffer,
    });

    switch (response.status) {
      case 201:
        break;
      case 400: {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? 'bad request');
      }
      default:
        throw new Error(`bad status code ${response.status}`);
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error('missing session location');
    }

    this.sessionUrl = new URL(location, this.conf.url).toString();

    return response.text();
  }

  private async setAnswer(answer: string): Promise<void> {
    if (this.state !== 'running') {
      throw new Error('closed');
    }

    const peerConnection = this.pc;
    if (peerConnection === null) {
      throw new Error('missing peer connection');
    }

    const editedAnswer = MediaMTXWebRTCPublisher.#editAnswer(
      answer,
      this.conf.videoBitrate
    );

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: 'answer',
        sdp: editedAnswer,
      })
    );

    if (this.state !== 'running') {
      return;
    }

    if (this.queuedCandidates.length !== 0) {
      this.sendLocalCandidates(this.queuedCandidates);
      this.queuedCandidates = [];
    }
  }

  private onLocalCandidate(event: RTCPeerConnectionIceEvent): void {
    if (this.state !== 'running') {
      return;
    }

    if (event.candidate !== null) {
      if (this.sessionUrl === null) {
        this.queuedCandidates.push(event.candidate);
      } else {
        this.sendLocalCandidates([event.candidate]);
      }
    }
  }

  private sendLocalCandidates(candidates: RTCIceCandidate[]): void {
    if (this.sessionUrl === null || this.offerData === null) {
      return;
    }

    void fetch(this.sessionUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag',
        'If-Match': '*',
      },
      body: MediaMTXWebRTCPublisher.#generateSdpFragment(this.offerData, candidates),
    })
      .then((response) => {
        switch (response.status) {
          case 204:
            break;
          case 404:
            throw new Error('stream not found');
          default:
            throw new Error(`bad status code ${response.status}`);
        }
      })
      .catch((error) => {
        this.handleError(error instanceof Error ? error.message : String(error));
      });
  }

  private onConnectionState(): void {
    if (this.state !== 'running' || this.pc === null) {
      return;
    }

    if (
      this.pc.connectionState === 'failed'
      || this.pc.connectionState === 'closed'
    ) {
      this.handleError('peer connection closed');
    } else if (this.pc.connectionState === 'connected') {
      this.conf.onConnected?.();
    }
  }
}

window.MediaMTXWebRTCPublisher = MediaMTXWebRTCPublisher;
