import { createHash, randomUUID } from 'node:crypto';
import { getRedisConnection, prisma } from '@hctv/db';
import type { MultistreamDestination } from '@hctv/db';
import { getUrlScheme } from '#shared/utils/multistream';
import type { MediaMTXRegion } from '#shared/utils/mediamtx/regions';
import { MEDIAMTX_SERVER_REGIONS } from './mediamtxServer';
import type { MediaMTXEnvs } from './mediamtxServer';

// Forward destinations added through hctvmtx's API live on the MediaMTX path, which only exists
// while the channel is publishing. So the DB holds what the streamer wants, and this reconciler
// makes the path match it: syncStream runs it every tick for live channels, and the settings
// actions run it right away so toggles apply without waiting for the next tick.
//
// Redis `multistream:<channel>` maps destination id -> the hctvmtx forward id we created, plus a
// hash of the dest so an edited server URL or key gets re-added.

const STATE_TTL_SECONDS = 60 * 60 * 24;
const LOCK_TTL_MS = 15_000;
// a destination the media server rejected waits this long before the next attempt
const FAILURE_BACKOFF_SECONDS = 60;

const stateKey = (channelName: string) => `multistream:${channelName}`;
const lockKey = (channelName: string) => `multistream:lock:${channelName}`;
const failureKey = (channelName: string, destinationId: string) =>
  `multistream:fail:${channelName}:${destinationId}`;

interface TrackedForward {
  mtxId: string;
  destHash: string;
}

interface ForwardDestBody {
  dest: string;
  whipBearerToken?: string;
}

export interface MtxForwardDest {
  id: string;
  state: 'idle' | 'forwarding' | 'error';
  lastError: string;
  outboundBytes: number;
}

export type MultistreamDestinationState = 'forwarding' | 'connecting' | 'error' | 'offline';

export interface MultistreamDestinationStatus {
  state: MultistreamDestinationState;
  error?: string;
  outboundBytes?: number;
}

export function buildForwardDest(
  destination: Pick<MultistreamDestination, 'serverUrl' | 'streamKey'>
): ForwardDestBody {
  const server = destination.serverUrl.trim();
  const key = destination.streamKey.trim();
  const scheme = getUrlScheme(server);

  if (scheme === 'whip' || scheme === 'whips') {
    return key ? { dest: server, whipBearerToken: key } : { dest: server };
  }

  if ((scheme === 'rtmp' || scheme === 'rtmps') && key) {
    // hctvmtx (gortmplib) takes the RTMP stream key from the URL fragment
    return { dest: `${server.replace(/\/+$/, '').replace(/#.*$/, '')}#${encodeURIComponent(key)}` };
  }

  return { dest: server };
}

function hashDest(body: ForwardDestBody) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function getRegionEnvs(region: string): MediaMTXEnvs | undefined {
  return MEDIAMTX_SERVER_REGIONS[region as MediaMTXRegion];
}

async function mtxFetch(envs: MediaMTXEnvs, path: string, init: RequestInit = {}) {
  return fetch(`${envs.apiUrl}${path}`, {
    ...init,
    headers: {
      ...(envs.apiAuthHeader ? { Authorization: envs.apiAuthHeader } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(5_000),
  });
}

async function readMtxError(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

// null when the path is gone or the server can't be reached: the caller can't tell what is running
async function listForwardDests(envs: MediaMTXEnvs, channelName: string) {
  const res = await mtxFetch(
    envs,
    `/v3/paths/forward-dests/list?path=${encodeURIComponent(channelName)}&itemsPerPage=100`
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { items?: MtxForwardDest[] };
  return body.items ?? [];
}

async function addForwardDest(envs: MediaMTXEnvs, channelName: string, body: ForwardDestBody) {
  const res = await mtxFetch(
    envs,
    `/v3/paths/forward-dests/add?path=${encodeURIComponent(channelName)}`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  if (!res.ok) {
    // a stock MediaMTX without the hctvmtx patch answers 404 here
    throw new Error(await readMtxError(res));
  }
  return (await res.json()) as MtxForwardDest;
}

async function deleteForwardDest(envs: MediaMTXEnvs, channelName: string, mtxId: string) {
  const res = await mtxFetch(
    envs,
    `/v3/paths/forward-dests/delete?path=${encodeURIComponent(channelName)}&id=${encodeURIComponent(mtxId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(await readMtxError(res));
  }
}

function parseTracked(raw: string | undefined): TrackedForward | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TrackedForward;
    return parsed.mtxId ? parsed : null;
  } catch {
    return null;
  }
}

async function withChannelLock(channelName: string, fn: () => Promise<void>) {
  const redis = getRedisConnection();
  const token = randomUUID();
  const isLocked = await redis.set(lockKey(channelName), token, 'PX', LOCK_TTL_MS, 'NX');
  // someone else is reconciling this channel; the next stream sync tick picks up whatever changed
  if (!isLocked) return;

  try {
    await fn();
  } finally {
    if ((await redis.get(lockKey(channelName))) === token) {
      await redis.del(lockKey(channelName));
    }
  }
}

/**
 * Makes the forward destinations on the channel's MediaMTX path match its enabled
 * multistream destinations. Pass `isLive: false` to only stop what we started.
 */
export async function reconcileMultistream(
  channelName: string,
  region: string,
  { isLive = true }: { isLive?: boolean } = {}
) {
  const envs = getRegionEnvs(region);
  if (!envs) return;

  await withChannelLock(channelName, async () => {
    const redis = getRedisConnection();
    const [destinations, trackedRaw] = await Promise.all([
      isLive
        ? prisma.multistreamDestination.findMany({
            where: { channel: { name: channelName }, enabled: true },
          })
        : Promise.resolve([] as MultistreamDestination[]),
      redis.hgetall(stateKey(channelName)),
    ]);

    if (destinations.length === 0 && Object.keys(trackedRaw).length === 0) return;

    const running = await listForwardDests(envs, channelName);
    if (!running) {
      // the path is gone (stream ended), so nothing we added survives either
      await redis.del(stateKey(channelName));
      return;
    }
    const runningIds = new Set(running.map((item) => item.id));

    const desired = new Map(
      destinations.map((destination) => {
        const body = buildForwardDest(destination);
        return [destination.id, { body, destHash: hashDest(body) }];
      })
    );

    for (const [destinationId, raw] of Object.entries(trackedRaw)) {
      const tracked = parseTracked(raw);
      const isRunning = tracked !== null && runningIds.has(tracked.mtxId);
      const wanted = desired.get(destinationId);

      if (isRunning && wanted && wanted.destHash === tracked.destHash) {
        desired.delete(destinationId);
        continue;
      }

      if (isRunning) {
        try {
          await deleteForwardDest(envs, channelName, tracked.mtxId);
        } catch (error) {
          console.error(`Failed to stop multistream ${destinationId} on ${channelName}:`, error);
          continue;
        }
      }
      await redis.hdel(stateKey(channelName), destinationId);
    }

    for (const [destinationId, { body, destHash }] of desired) {
      if (await redis.exists(failureKey(channelName, destinationId))) continue;

      try {
        const created = await addForwardDest(envs, channelName, body);
        await redis.hset(
          stateKey(channelName),
          destinationId,
          JSON.stringify({ mtxId: created.id, destHash } satisfies TrackedForward)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to start multistream ${destinationId} on ${channelName}:`, message);
        await redis.setex(failureKey(channelName, destinationId), FAILURE_BACKOFF_SECONDS, message);
      }
    }

    await redis.expire(stateKey(channelName), STATE_TTL_SECONDS);
  });
}

// forget a destination's backoff so a fixed or re-enabled destination is retried immediately
export async function clearMultistreamFailure(channelName: string, destinationId: string) {
  await getRedisConnection().del(failureKey(channelName, destinationId));
}

export async function clearMultistreamState(channelName: string) {
  await getRedisConnection().del(stateKey(channelName));
}

// live channels that have destinations configured or forwards we still need to clean up
export async function reconcileLiveMultistreams(liveStreams: Map<string, string>) {
  if (liveStreams.size === 0) return;

  const redis = getRedisConnection();
  const names = [...liveStreams.keys()];
  const [configured, trackedExists] = await Promise.all([
    prisma.channel.findMany({
      where: { name: { in: names }, multistreamDestinations: { some: { enabled: true } } },
      select: { name: true },
    }),
    Promise.all(names.map((name) => redis.exists(stateKey(name)))),
  ]);

  const toReconcile = new Set(configured.map((channel) => channel.name));
  names.forEach((name, i) => {
    if (trackedExists[i]) toReconcile.add(name);
  });

  await Promise.all(
    [...toReconcile].map(async (name) => {
      try {
        await reconcileMultistream(name, liveStreams.get(name)!);
      } catch (error) {
        console.error(`Multistream reconcile failed for ${name}:`, error);
      }
    })
  );
}

// what the media server reports is a raw Go error, which can also contain internal addresses,
// so streamers get advice instead
function describeForwardError(raw: string): string {
  const error = raw.toLowerCase();
  if (/no such host|lookup/.test(error)) {
    return "Couldn't find this server. Check the Server URL.";
  }
  if (/x509|certificate|tls/.test(error)) {
    return "The server's certificate isn't trusted. Try rtmp:// instead of rtmps://.";
  }
  if (/connection refused|timeout|unreachable|deadline exceeded|no route/.test(error)) {
    return "Couldn't connect to this server. Check the Server URL, or the platform may be down.";
  }
  if (/eof|reset by peer|broken pipe|closed|rejected|unauthorized|forbidden/.test(error)) {
    return "The platform hung up. Usually the stream key is wrong, or the channel there isn't ready to go live.";
  }
  if (/404|not found/.test(error)) {
    return "This hctv server can't multistream yet.";
  }
  return "Couldn't send your stream here. hctv keeps retrying.";
}

export async function getMultistreamStatuses(
  channelName: string,
  region: string,
  isLive: boolean,
  destinations: Pick<MultistreamDestination, 'id' | 'enabled'>[]
): Promise<Record<string, MultistreamDestinationStatus>> {
  const statuses: Record<string, MultistreamDestinationStatus> = {};
  for (const destination of destinations) {
    statuses[destination.id] = { state: 'offline' };
  }
  if (!isLive) return statuses;

  const envs = getRegionEnvs(region);
  const redis = getRedisConnection();
  const [trackedRaw, failures, running] = await Promise.all([
    redis.hgetall(stateKey(channelName)),
    Promise.all(destinations.map((d) => redis.get(failureKey(channelName, d.id)))),
    envs ? listForwardDests(envs, channelName).catch(() => null) : Promise.resolve(null),
  ]);
  const runningById = new Map((running ?? []).map((item) => [item.id, item]));

  destinations.forEach((destination, i) => {
    if (!destination.enabled) return;

    const failure = failures[i];
    if (failure) {
      statuses[destination.id] = { state: 'error', error: describeForwardError(failure) };
      return;
    }

    const tracked = parseTracked(trackedRaw[destination.id]);
    const item = tracked ? runningById.get(tracked.mtxId) : undefined;
    if (!item) {
      statuses[destination.id] = { state: 'connecting' };
      return;
    }

    statuses[destination.id] =
      item.state === 'forwarding'
        ? { state: 'forwarding', outboundBytes: item.outboundBytes }
        : item.state === 'error'
          ? { state: 'error', error: describeForwardError(item.lastError) }
          : { state: 'connecting' };
  });

  return statuses;
}
