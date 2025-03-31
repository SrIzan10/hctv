import { registerNotificationWorker } from './worker/notification';

// Register all workers in one place
export async function registerWorkers(): Promise<void> {
  await registerNotificationWorker();
  console.log('All workers registered successfully');
}