import { MediaMTXRegion } from './regions';

export interface MediaMTXEnvs {
  apiUrl: string;
}

export const MEDIAMTX_SERVER_REGIONS: Record<MediaMTXRegion, MediaMTXEnvs> = {
  eu: {
    apiUrl: process.env.MEDIAMTX_API_EU!,
  },
  asia: {
    apiUrl: process.env.MEDIAMTX_API_ASIA!,
  },
};

export function getMediamtxEnvs(region: MediaMTXRegion = 'eu'): MediaMTXEnvs {
  const envs = MEDIAMTX_SERVER_REGIONS[region];

  if (!envs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return envs;
}
