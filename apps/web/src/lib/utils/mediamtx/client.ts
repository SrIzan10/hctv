import { MediaMTXRegion } from './regions';
import { getEnv } from '@/lib/env';

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
  const envs: Record<MediaMTXRegion, MediaMTXClientEnvs> = {
    hq: {
      publicUrl: getEnv('NEXT_PUBLIC_MEDIAMTX_URL_HQ')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_HQ')!,
      whip: getEnv('NEXT_PUBLIC_MEDIAMTX_WHIP_ROUTE_HQ')!,
      whipEnabled: false,
      emoji: '🇺🇸',
      string: 'HQ Server A',
    },
    ethande: {
      publicUrl: getEnv('NEXT_PUBLIC_MEDIAMTX_URL_ETHANDE')!,
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

export function getMediamtxClientRegionOptions(): MediaMTXClientRegionOption[] {
  return [
    {
      value: 'hq',
      emoji: '🇺🇸',
      label: 'HQ Server A',
      whipEnabled: false,
    },
  ];
}
