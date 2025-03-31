import type { ChatPostMessageArguments } from '@slack/web-api';
import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/services/redis';
import snClient from '../services/slackNotifier';

// Singleton instances for notifier
const globalForNotifier = global as unknown as { 
  notificationQueue: Queue | null;
  notificationWorker: Worker | null;
};

// Initialize if they don't exist
if (!globalForNotifier.notificationQueue) {
  globalForNotifier.notificationQueue = null;
  globalForNotifier.notificationWorker = null;
}

// Get or create the notification queue
export function getNotificationQueue(): Queue {
  if (!globalForNotifier.notificationQueue) {
    globalForNotifier.notificationQueue = new Queue('notifications', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    });
  }
  return globalForNotifier.notificationQueue;
}

// Cleanup function for notification resources
export async function closeNotificationResources(): Promise<void> {
  // Close worker
  if (globalForNotifier.notificationWorker) {
    await globalForNotifier.notificationWorker.close();
    globalForNotifier.notificationWorker = null;
    console.log('Notification worker closed');
  }
  
  // Close queue
  if (globalForNotifier.notificationQueue) {
    await globalForNotifier.notificationQueue.close();
    globalForNotifier.notificationQueue = null;
    console.log('Notification queue closed');
  }
}