import type { Channel, StreamInfo } from '@hctv/db';

// shape returned by GET /api/stream/info (dates are ISO strings on the wire, typed as in the old app)
export type StreamInfoResponse = (StreamInfo & {
  channel: Channel & {
    isRestricted?: boolean;
    restrictionExpiresAt?: string | null;
  };
})[];
