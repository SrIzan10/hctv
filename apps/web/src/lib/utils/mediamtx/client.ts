import { MediaMTXRegion } from './regions';
import { getEnv } from '@/lib/env';

const PRODUCTION_HLS_EDGE_URL = 'https://hls-edge.hackclub.tv';

export interface MediaMTXClientEnvs {
  publicUrl: string;
  ingestRoute: string;
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

export function getMediamtxClientEnvs(region: MediaMTXRegion = 'hq'): MediaMTXClientEnvs {
  const edgeUrl = getHlsEdgeUrl();
  const envs: Record<MediaMTXRegion, MediaMTXClientEnvs> = {
    hq: {
      publicUrl: edgeUrl ? `${edgeUrl}/hq` : getEnv('NEXT_PUBLIC_MEDIAMTX_URL_HQ')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_HQ')!,
      whip: getEnv('NEXT_PUBLIC_MEDIAMTX_WHIP_ROUTE_HQ')!,
      whipEnabled: false,
      emoji: '🇺🇸',
      string: 'HQ Server A',
    },
    ethande: {
      publicUrl: edgeUrl ? `${edgeUrl}/ethande` : getEnv('NEXT_PUBLIC_MEDIAMTX_URL_ETHANDE')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_ETHANDE')!,
      whip: getEnv('NEXT_PUBLIC_MEDIAMTX_WHIP_ROUTE_ETHANDE')!,
      whipEnabled: true,
      emoji: '🇩🇪',
      string: 'eth0\'s VPS',
    },
  };

  const regionEnvs = envs[region];

  if (!regionEnvs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return regionEnvs;
}

function getHlsEdgeUrl(): string | undefined {
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
      whipEnabled: false,
    },
    {
      value: 'ethande',
      emoji: '🇩🇪',
      label: 'eth0\'s VPS',
      whipEnabled: true,
    },
  ];
}
