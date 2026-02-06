import { MediaMTXRegion } from './regions';

export interface MediaMTXEnvs {
  apiUrl: string;
}

export const MEDIAMTX_SERVER_REGIONS: Record<MediaMTXRegion, MediaMTXEnvs> = {
  hq: {
    apiUrl: process.env.MEDIAMTX_API_HQ!,
  },
};

export function getMediamtxEnvs(region: MediaMTXRegion = 'hq'): MediaMTXEnvs {
  const envs = MEDIAMTX_SERVER_REGIONS[region];

  if (!envs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return envs;
}
