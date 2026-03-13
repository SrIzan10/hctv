import { registerNotificationWorker } from './worker/notification';
import { registerThumbnailWorker } from './worker/thumbnails';
import { trackWebJob } from '../metrics';

export async function registerWorkers(): Promise<void> {
  await trackWebJob('register_workers', async () => {
    await registerNotificationWorker();
    await registerThumbnailWorker();
    console.log('All workers registered successfully');
  });
}
