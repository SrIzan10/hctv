import { startJobs } from '../utils/jobs/start';

// Set RUN_WORKERS=false on replicas that must not run background jobs/workers.
const globalForJobs = globalThis as unknown as { __hctvJobsStarted?: boolean };

export default defineNitroPlugin(async () => {
  if (process.env.RUN_WORKERS === 'false' || process.env.RUN_WORKERS === '0') {
    console.log('RUN_WORKERS disabled, skipping background jobs');
    return;
  }
  // guard against double start (dev HMR re-evaluates plugins)
  if (globalForJobs.__hctvJobsStarted) return;
  globalForJobs.__hctvJobsStarted = true;

  try {
    await startJobs();
  } catch (error) {
    console.error('Failed to start background jobs:', error);
  }
});
