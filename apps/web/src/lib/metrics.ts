import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

function createMetricsStore() {
  const register = new Registry();
  register.setDefaultLabels({ app: 'web' });

  collectDefaultMetrics({
    prefix: 'hctv_web_',
    register,
  });

  const backgroundJobRuns = new Counter({
    name: 'hctv_web_background_job_runs_total',
    help: 'Total number of background jobs run by the web app.',
    labelNames: ['job', 'status'],
    registers: [register],
  });

  const backgroundJobDuration = new Histogram({
    name: 'hctv_web_background_job_duration_seconds',
    help: 'Background job execution time in seconds.',
    labelNames: ['job', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [register],
  });

  const liveStreams = new Gauge({
    name: 'hctv_web_live_streams',
    help: 'Current number of live streams grouped by MediaMTX region.',
    labelNames: ['region'],
    registers: [register],
  });

  const streamPathsSeen = new Gauge({
    name: 'hctv_web_stream_paths_seen',
    help: 'Current number of ready MediaMTX paths seen during the latest sync.',
    labelNames: ['region'],
    registers: [register],
  });

  const liveStreamTransitions = new Counter({
    name: 'hctv_web_live_stream_transitions_total',
    help: 'Live stream state transitions observed by the web app.',
    labelNames: ['transition', 'region'],
    registers: [register],
  });

  const streamSyncScrapes = new Counter({
    name: 'hctv_web_stream_sync_scrapes_total',
    help: 'MediaMTX region scrapes attempted by stream sync.',
    labelNames: ['region', 'status'],
    registers: [register],
  });

  const activeViewers = new Gauge({
    name: 'hctv_web_active_viewers',
    help: 'Current number of active viewers across all live streams.',
    registers: [register],
  });

  const activeViewersByRegion = new Gauge({
    name: 'hctv_web_active_viewers_by_region',
    help: 'Current number of active viewers grouped by stream region.',
    labelNames: ['region'],
    registers: [register],
  });

  const viewerCountTrackedStreams = new Gauge({
    name: 'hctv_web_viewer_count_tracked_streams',
    help: 'Number of live streams included in the latest viewer sync.',
    registers: [register],
  });

  const streamsWithViewers = new Gauge({
    name: 'hctv_web_streams_with_viewers',
    help: 'Current number of live streams with at least one viewer.',
    registers: [register],
  });

  const hottestStreamViewers = new Gauge({
    name: 'hctv_web_hottest_stream_viewers',
    help: 'Current viewer count of the most watched live stream.',
    registers: [register],
  });

  const thumbnailJobsEnqueued = new Counter({
    name: 'hctv_web_thumbnail_jobs_enqueued_total',
    help: 'Total thumbnail refresh jobs enqueued by region.',
    labelNames: ['region'],
    registers: [register],
  });

  const thumbnailRefreshTargets = new Gauge({
    name: 'hctv_web_thumbnail_refresh_targets',
    help: 'Number of live streams targeted in the latest thumbnail refresh run.',
    registers: [register],
  });

  const notificationsEnqueued = new Counter({
    name: 'hctv_web_notifications_enqueued_total',
    help: 'Notification jobs enqueued when streams go live.',
    labelNames: ['target'],
    registers: [register],
  });

  const cacheEntries = new Gauge({
    name: 'hctv_web_cache_entries',
    help: 'Current number of records mirrored into Redis by cache-sync jobs.',
    labelNames: ['cache'],
    registers: [register],
  });

  const platformInventory = new Gauge({
    name: 'hctv_web_platform_inventory',
    help: 'High-level counts of important platform records.',
    labelNames: ['entity'],
    registers: [register],
  });

  const mediamtxAuthRequests = new Counter({
    name: 'hctv_web_mediamtx_auth_requests_total',
    help: 'Total MediaMTX auth decisions handled by the web app.',
    labelNames: ['action', 'protocol', 'outcome'],
    registers: [register],
  });

  const mediamtxAuthDuration = new Histogram({
    name: 'hctv_web_mediamtx_auth_duration_seconds',
    help: 'MediaMTX auth request duration in seconds.',
    labelNames: ['action', 'protocol', 'outcome'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [register],
  });

  return {
    register,
    activeViewers,
    activeViewersByRegion,
    backgroundJobDuration,
    backgroundJobRuns,
    cacheEntries,
    hottestStreamViewers,
    liveStreams,
    liveStreamTransitions,
    mediamtxAuthDuration,
    mediamtxAuthRequests,
    notificationsEnqueued,
    platformInventory,
    streamPathsSeen,
    streamsWithViewers,
    streamSyncScrapes,
    thumbnailRefreshTargets,
    thumbnailJobsEnqueued,
    viewerCountTrackedStreams,
  };
}

const globalForMetrics = globalThis as typeof globalThis & {
  __hctvWebMetrics?: ReturnType<typeof createMetricsStore>;
};

const metrics = (globalForMetrics.__hctvWebMetrics ??= createMetricsStore());

export const webMetricsRegistry = metrics.register;

export async function trackWebJob<T>(job: string, fn: () => Promise<T>): Promise<T> {
  const stopTimer = metrics.backgroundJobDuration.startTimer({ job });
  let status = 'success';

  try {
    return await fn();
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    metrics.backgroundJobRuns.inc({ job, status });
    stopTimer({ job, status });
  }
}

export function setLiveStreamsByRegion(streamsByRegion: Record<string, number>): void {
  metrics.liveStreams.reset();

  for (const [region, count] of Object.entries(streamsByRegion)) {
    metrics.liveStreams.set({ region }, count);
  }
}

export function setStreamPathsByRegion(pathsByRegion: Record<string, number>): void {
  metrics.streamPathsSeen.reset();

  for (const [region, count] of Object.entries(pathsByRegion)) {
    metrics.streamPathsSeen.set({ region }, count);
  }
}

export function recordLiveStreamTransition(transition: 'online' | 'offline', region: string): void {
  metrics.liveStreamTransitions.inc({ transition, region });
}

export function recordStreamSyncScrape(region: string, status: 'success' | 'error'): void {
  metrics.streamSyncScrapes.inc({ region, status });
}

export function setViewerSnapshot(snapshot: {
  totalViewers: number;
  trackedStreams: number;
  viewersByRegion: Record<string, number>;
  streamsWithViewers: number;
  hottestStreamViewers: number;
}): void {
  metrics.activeViewers.set(snapshot.totalViewers);
  metrics.viewerCountTrackedStreams.set(snapshot.trackedStreams);
  metrics.streamsWithViewers.set(snapshot.streamsWithViewers);
  metrics.hottestStreamViewers.set(snapshot.hottestStreamViewers);
  metrics.activeViewersByRegion.reset();

  for (const [region, count] of Object.entries(snapshot.viewersByRegion)) {
    metrics.activeViewersByRegion.set({ region }, count);
  }
}

export function recordThumbnailJobsEnqueued(jobsByRegion: Record<string, number>): void {
  for (const [region, count] of Object.entries(jobsByRegion)) {
    if (count > 0) {
      metrics.thumbnailJobsEnqueued.inc({ region }, count);
    }
  }
}

export function setThumbnailRefreshTargets(count: number): void {
  metrics.thumbnailRefreshTargets.set(count);
}

export function recordNotificationsEnqueued(target: 'channel' | 'dm', count: number): void {
  if (count > 0) {
    metrics.notificationsEnqueued.inc({ target }, count);
  }
}

export function setCacheEntryCount(cache: 'sessions' | 'stream_keys', count: number): void {
  metrics.cacheEntries.set({ cache }, count);
}

export function setPlatformInventory(snapshot: Record<string, number>): void {
  metrics.platformInventory.reset();

  for (const [entity, count] of Object.entries(snapshot)) {
    metrics.platformInventory.set({ entity }, count);
  }
}

export function recordMediamtxAuth(
  action: string,
  protocol: string,
  outcome: string,
  durationSeconds: number
): void {
  metrics.mediamtxAuthRequests.inc({ action, protocol, outcome });
  metrics.mediamtxAuthDuration.observe({ action, protocol, outcome }, durationSeconds);
}
