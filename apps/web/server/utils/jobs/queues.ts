import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '@hctv/db';

export type SlackNotificationJobData = {
  channel: string;
  text: string;
  unfurl_links?: boolean;
  metadata?: {
    type: 'custom_stream_announcement';
    managedChannelId: string;
    ownerSlackId: string;
    ownerChannelName: string;
  };
};

const globalForNotifier = global as unknown as { 
  notificationQueue: Queue<SlackNotificationJobData> | null;
  notificationWorker: Worker | null;

  thumbnailQueue: Queue | null;
  thumbnailWorker: Worker | null;
};

if (!globalForNotifier.notificationQueue) {
  globalForNotifier.notificationQueue = null;
  globalForNotifier.notificationWorker = null;
}

export function getNotificationQueue(): Queue<SlackNotificationJobData> {
  if (!globalForNotifier.notificationQueue) {
    globalForNotifier.notificationQueue = new Queue<SlackNotificationJobData>('notifications', {
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
