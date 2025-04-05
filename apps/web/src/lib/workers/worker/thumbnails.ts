import { Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/services/redis';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
const pExec = promisify(exec);

const globalForWorker = global as unknown as {
  thumbnailWorker: Worker | null;
};

if (!globalForWorker.thumbnailWorker) {
  globalForWorker.thumbnailWorker = null;
}

export async function registerThumbnailWorker(): Promise<void> {
  if (globalForWorker.thumbnailWorker) {
    console.log('Notification worker already registered');
    return;
  }

  console.log('Registering notification worker...');

  const worker = new Worker(
    'thumbnails',
    async (job) => {
      try {
        // this is totally unnecessary, but i'll keep it for security purposes.
        const name = job.data.name.replace(/[^a-zA-Z0-9]/g, '_');
        const m3u8location = `/dev/shm/hls/${name}.m3u8`;
        
        if (!existsSync(m3u8location)) return;
        if (!existsSync('/dev/shm/hctv-thumb')) {
          await pExec('mkdir -p /dev/shm/hctv-thumb');
        }
        // unnecessary for development, but maybe docker volumes mess with permissions in prod
        await pExec('chown -R $USER /dev/shm/hctv-thumb');

        exec(
          `/usr/bin/ffmpeg -i ${m3u8location} -vframes 1 -an -y -f image2 /dev/shm/hctv-thumb/${name}.webp`,
          (error) => {
            if (error) {
              console.error(`Error: ${error.message}`);
              return { success: false, error: error.message };
            }
          }
        );

        return { success: true };
      } catch (e) {
        console.error('Slack notification failed:', e);
        // @ts-ignore e is unknown
        return { success: false, error: e.message };
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
      limiter: {
        max: 50,
        duration: 30000,
      },
    }
  );

  globalForWorker.thumbnailWorker = worker;
}

// Close the worker
export async function closeThumbnailWorker(): Promise<void> {
  if (globalForWorker.thumbnailWorker) {
    await globalForWorker.thumbnailWorker.close();
    globalForWorker.thumbnailWorker = null;
  }
}
