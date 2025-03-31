import { Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/services/redis';
import snClient from '@/lib/services/slackNotifier';

const globalForWorker = global as unknown as { 
  notificationWorker: Worker | null;
};

if (!globalForWorker.notificationWorker) {
  globalForWorker.notificationWorker = null;
}

// Register the Slack notification worker
export async function registerNotificationWorker(): Promise<void> {
  if (globalForWorker.notificationWorker) {
    console.log('Notification worker already registered');
    return;
  }

  console.log('Registering notification worker...');
  
  const worker = new Worker('notifications', async (job) => {
    console.log('Processing job:', job.id);
    console.log('Job data:', job.data);
    
    try {
      await snClient.chat.postMessage(job.data);
      return { success: true };
    } catch (e) {
      console.error('Slack notification failed:', e);
      // @ts-ignore e is unknown
      return { success: false, error: e.message };
    }
  }, {
    connection: getRedisConnection(),
    concurrency: 1,
    limiter: {
      max: 45,
      duration: 60000
    }
  });
  
  // Set up event handlers
  worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
  });
  
  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
  });
  
  globalForWorker.notificationWorker = worker;
  console.log('Notification worker registered successfully');
}

// Close the worker
export async function closeNotificationWorker(): Promise<void> {
  if (globalForWorker.notificationWorker) {
    await globalForWorker.notificationWorker.close();
    globalForWorker.notificationWorker = null;
    console.log('Notification worker closed');
  }
}