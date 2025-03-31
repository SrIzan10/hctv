import { registerNotificationWorker } from './worker/notification';

export async function registerWorkers(): Promise<void> {
  await registerNotificationWorker();
  console.log('All workers registered successfully');
}