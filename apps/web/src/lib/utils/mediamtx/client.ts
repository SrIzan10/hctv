import { MediaMTXRegion } from './regions';
import { getEnv } from '@/lib/env';

export interface MediaMTXClientEnvs {
  publicUrl: string;
  ingestRoute: string;
  emoji: string;
  string: string;
}

export function getMediamtxClientEnvs(region: MediaMTXRegion = 'eu'): MediaMTXClientEnvs {
  const envs: Record<MediaMTXRegion, MediaMTXClientEnvs> = {
    eu: {
      publicUrl: getEnv('NEXT_PUBLIC_MEDIAMTX_URL_EU')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_EU')!,
      emoji: '🇪🇺',
      string: 'EU',
    },
    asia: {
      publicUrl: getEnv('NEXT_PUBLIC_MEDIAMTX_URL_ASIA')!,
      ingestRoute: getEnv('NEXT_PUBLIC_MEDIAMTX_INGEST_ROUTE_ASIA')!,
      emoji: '🇸🇬',
      string: 'Singapore'
    },
  };

  const regionEnvs = envs[region];

  if (!regionEnvs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return regionEnvs;
}

