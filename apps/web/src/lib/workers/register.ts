import { registerNotificationWorker } from './worker/notification';
import { registerThumbnailWorker } from './worker/thumbnails';

export async function registerWorkers(): Promise<void> {
  await registerNotificationWorker();
  await registerThumbnailWorker();
  console.log('All workers registered successfully');
}