import { Worker } from 'bullmq';
import { getRedisConnection, prisma } from '@hctv/db';
import snClient from '@/lib/services/slackNotifier';
import type { SlackNotificationJobData } from '@/lib/workers';

const globalForWorker = global as unknown as { 
  notificationWorker: Worker | null;
};

if (!globalForWorker.notificationWorker) {
  globalForWorker.notificationWorker = null;
}

export async function registerNotificationWorker(): Promise<void> {
  if (globalForWorker.notificationWorker) {
    console.log('Notification worker already registered');
    return;
  }

  console.log('Registering notification worker...');
  
  const worker = new Worker<SlackNotificationJobData>('notifications', async (job) => {
    try {
      const { metadata: _metadata, ...slackMessage } = job.data;
      await snClient.chat.postMessage(slackMessage);
      return { success: true };
    } catch (e) {
      console.error('Slack notification failed:', e);

      if (job.data.metadata?.type === 'custom_stream_announcement') {
        const channel = await prisma.channel.findUnique({
          where: { id: job.data.metadata.managedChannelId },
          select: {
            notifChannels: true,
          },
        });

        if (channel?.notifChannels.includes(job.data.channel)) {
          await prisma.channel.update({
            where: { id: job.data.metadata.managedChannelId },
            data: {
              notifChannels: channel.notifChannels.filter(
                (channelId) => channelId !== job.data.channel
              ),
            },
          });
        }

        try {
          await snClient.chat.postMessage({
            channel: job.data.metadata.ownerSlackId,
            text: `I couldn't send a go-live notification for *${job.data.metadata.ownerChannelName}* to Slack channel \`${job.data.channel}\`, so I removed it from that channel's notification list.\nIf you still want notifications there, please make sure the bot can post in that channel and add it again in settings.`,
          });
        } catch (ownerNotificationError) {
          console.error('Failed to notify channel owner about Slack notification removal:', ownerNotificationError);
        }
      }

      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown Slack notification error',
      };
    }
  }, {
    connection: getRedisConnection().options,
    concurrency: 1,
    limiter: {
      max: 45,
      duration: 60000
    }
  });
  
  globalForWorker.notificationWorker = worker;
}

// Close the worker
export async function closeNotificationWorker(): Promise<void> {
  if (globalForWorker.notificationWorker) {
    await globalForWorker.notificationWorker.close();
    globalForWorker.notificationWorker = null;
  }
}
