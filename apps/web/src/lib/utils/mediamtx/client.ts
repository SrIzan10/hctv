import { MediaMTXRegion } from './regions';
import { getEnv } from '@/lib/env';

export interface MediaMTXClientEnvs {
  publicUrl: string;
  ingestRoute: string;
  emoji: string;
  string: string;
}

export function getMediamtxClientEnvs(region: MediaMTXRegion = 'hq'): MediaMTXClientEnvs {
  const envs: Record<MediaMTXRegion, MediaMTXClientEnvs> = {
    hq: {
      publicUrl: getEnv('NEXT_PUBLIC_MEDIAMTX_URL_HQ')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_HQ')!,
      emoji: '🇺🇸',
      string: 'HQ Server A',
    },
  };

  const regionEnvs = envs[region];

  if (!regionEnvs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return regionEnvs;
}

