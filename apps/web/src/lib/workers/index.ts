import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '@hctv/db';

const globalForNotifier = global as unknown as { 
  notificationQueue: Queue | null;
  notificationWorker: Worker | null;

  thumbnailQueue: Queue | null;
  thumbnailWorker: Worker | null;
};

if (!globalForNotifier.notificationQueue) {
  globalForNotifier.notificationQueue = null;
  globalForNotifier.notificationWorker = null;
}

export function getNotificationQueue(): Queue {
  if (!globalForNotifier.notificationQueue) {
    globalForNotifier.notificationQueue = new Queue('notifications', {
      connection: getRedisConnection().options,
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

export function getThumbnailQueue(): Queue {
  if (!globalForNotifier.thumbnailQueue) {
    globalForNotifier.thumbnailQueue = new Queue('thumbnails', {
      connection: getRedisConnection().options,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    });
  }
  return globalForNotifier.thumbnailQueue;
}