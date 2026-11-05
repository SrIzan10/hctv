import type { MediaMTXRegion } from './regions';
import { getEnv } from '../env';

const PRODUCTION_HLS_EDGE_URL = 'https://hls-edge.hackclub.tv';

export interface MediaMTXClientEnvs {
  publicUrl: string;
  ingestRoute: string;
  rtmpRoute: string;
  whip: string;
  whipEnabled: boolean;
  emoji: string;
  string: string;
}

export interface MediaMTXClientRegionOption {
  value: MediaMTXRegion;
  emoji: string;
  label: string;
  whipEnabled: boolean;
}

// whether a region serves WebRTC (WHIP publishing and WHEP playback) to browsers. HQ doesn't
// expose its WebRTC ports in production; NEXT_PUBLIC_MEDIAMTX_WEBRTC_<REGION>=true turns it on
// (local dev, or once the ports are open).
function isWebrtcEnabled(region: MediaMTXRegion, fallback: boolean): boolean {
  const value = getEnv(`NEXT_PUBLIC_MEDIAMTX_WEBRTC_${region.toUpperCase()}`);
  return value === undefined ? fallback : value === 'true';
}

export function getMediamtxClientEnvs(region: MediaMTXRegion = 'hq'): MediaMTXClientEnvs {
  const edgeUrl = getHlsEdgeUrl();
  const envs: Record<MediaMTXRegion, MediaMTXClientEnvs> = {
    hq: {
      publicUrl: edgeUrl ? `${edgeUrl}/hq` : getEnv('NEXT_PUBLIC_MEDIAMTX_URL_HQ')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_HQ')!,
      rtmpRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_RTMP_ROUTE_HQ')!,
      whip: getEnv('NEXT_PUBLIC_MEDIAMTX_WHIP_ROUTE_HQ')!,
      whipEnabled: isWebrtcEnabled('hq', false),
      emoji: '🇺🇸',
      string: 'HQ Server A',
    },
    ethande: {
      publicUrl: edgeUrl ? `${edgeUrl}/ethande` : getEnv('NEXT_PUBLIC_MEDIAMTX_URL_ETHANDE')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_ETHANDE')!,
      rtmpRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_RTMP_ROUTE_ETHANDE')!,
      whip: getEnv('NEXT_PUBLIC_MEDIAMTX_WHIP_ROUTE_ETHANDE')!,
      whipEnabled: isWebrtcEnabled('ethande', true),
      emoji: '🇩🇪',
      string: "eth0's VPS",
    },
  };

  const regionEnvs = envs[region];

  if (!regionEnvs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return regionEnvs;
}

export function getHlsEdgeUrl(): string | undefined {
  const configuredUrl = getEnv('NEXT_PUBLIC_HLS_EDGE_URL');

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'hackclub.tv') {
    return PRODUCTION_HLS_EDGE_URL;
  }

  return undefined;
}

export function getMediamtxClientRegionOptions(): MediaMTXClientRegionOption[] {
  return [
    {
      value: 'hq',
      emoji: '🇺🇸',
      label: 'HQ Server A',
      whipEnabled: isWebrtcEnabled('hq', false),
    },
    {
      value: 'ethande',
      emoji: '🇩🇪',
      label: "eth0's VPS",
      whipEnabled: isWebrtcEnabled('ethande', true),
    },
  ];
}

// WebRTC playback shares the WHIP server, so it's available wherever WHIP is
export function getWhepUrl(channelName: string, region: MediaMTXRegion): string | null {
  const { whip, whipEnabled } = getMediamtxClientEnvs(region);
  if (!whipEnabled || !whip) return null;
  return `${whip.replace(/\/$/, '')}/${encodeURIComponent(channelName)}/whep`;
}
