import { MediaMTXRegion } from './regions';

export interface MediaMTXEnvs {
  apiUrl: string;
  apiAuthHeader?: string;
}

export const MEDIAMTX_SERVER_REGIONS: Record<MediaMTXRegion, MediaMTXEnvs> = {
  hq: {
    apiUrl: process.env.MEDIAMTX_API_HQ!,
    apiAuthHeader: getMediamtxApiAuthHeader(),
  },
};

export function getMediamtxEnvs(region: MediaMTXRegion = 'hq'): MediaMTXEnvs {
  const envs = MEDIAMTX_SERVER_REGIONS[region];

  if (!envs) {
    throw new Error(`Invalid MediaMTX region: ${region}`);
  }

  return envs;
}

function getMediamtxApiAuthHeader() {
  const apiKey = process.env.MEDIAMTX_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  return `Basic ${Buffer.from(`hctv-api:${apiKey}`).toString('base64')}`;
}
