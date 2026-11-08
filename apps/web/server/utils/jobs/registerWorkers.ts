import { registerNotificationWorker } from './workers/notification';
import { registerThumbnailWorker } from './workers/thumbnails';
import { trackWebJob } from '../webMetrics';

export async function registerWorkers(): Promise<void> {
  await trackWebJob('register_workers', async () => {
    await registerNotificationWorker();
    await registerThumbnailWorker();
    console.log('All workers registered successfully');
  });
}
