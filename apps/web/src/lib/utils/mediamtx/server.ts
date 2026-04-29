import { MediaMTXRegion } from './regions';

export interface MediaMTXEnvs {
  apiUrl: string;
  apiAuthHeader?: string;
}

export const MEDIAMTX_SERVER_REGIONS: Partial<Record<MediaMTXRegion, MediaMTXEnvs>> = {
  hq: createMediamtxEnvs(process.env.MEDIAMTX_API_HQ),
  ethande: createMediamtxEnvs(process.env.MEDIAMTX_API_ETHANDE),
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

function createMediamtxEnvs(apiUrl?: string): MediaMTXEnvs | undefined {
  if (!apiUrl) {
    return undefined;
  }

  return {
    apiUrl,
    apiAuthHeader: getMediamtxApiAuthHeader(),
  };
}
