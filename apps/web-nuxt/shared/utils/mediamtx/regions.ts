export const MEDIAMTX_REGIONS = ['hq', 'ethande'] as const;

export type MediaMTXRegion = (typeof MEDIAMTX_REGIONS)[number];
