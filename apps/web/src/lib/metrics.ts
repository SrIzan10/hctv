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

  const activeViewers = new Gauge({
    name: 'hctv_web_active_viewers',
    help: 'Current number of active viewers across all live streams.',
    registers: [register],
  });

  const viewerCountTrackedStreams = new Gauge({
    name: 'hctv_web_viewer_count_tracked_streams',
    help: 'Number of live streams included in the latest viewer sync.',
    registers: [register],
  });

  const thumbnailJobsEnqueued = new Counter({
    name: 'hctv_web_thumbnail_jobs_enqueued_total',
    help: 'Total thumbnail refresh jobs enqueued by region.',
    labelNames: ['region'],
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
    backgroundJobDuration,
    backgroundJobRuns,
    liveStreams,
    mediamtxAuthDuration,
    mediamtxAuthRequests,
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

export function setViewerSnapshot(totalViewers: number, trackedStreams: number): void {
  metrics.activeViewers.set(totalViewers);
  metrics.viewerCountTrackedStreams.set(trackedStreams);
}

export function recordThumbnailJobsEnqueued(jobsByRegion: Record<string, number>): void {
  for (const [region, count] of Object.entries(jobsByRegion)) {
    if (count > 0) {
      metrics.thumbnailJobsEnqueued.inc({ region }, count);
    }
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
