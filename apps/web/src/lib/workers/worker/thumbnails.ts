import { Worker } from 'bullmq';
import { getRedisConnection } from '@hctv/db';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { exec as execCallback } from 'node:child_process';
import { MEDIAMTX_URL } from '@/lib/env';
import { getMediamtxClientEnvs } from '@/lib/utils/mediamtx/client';
const pExec = promisify(execCallback);

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

  console.log('Registering thumbnail worker...');
  const worker = new Worker(
    'thumbnails',
    async (job) => {
      try {
        // this is totally unnecessary, but i'll keep it for security purposes.
        const name = job.data.name.replace(/[^a-zA-Z0-9]/g, '_');
        const server = job.data.server || 'default';
        const srvValues = getMediamtxClientEnvs(server);
        
        const m3u8location = `${srvValues.publicUrl}/${name}/index.m3u8`;
        const thumbDir = '/dev/shm/hctv-thumb';
        
        if (!existsSync(thumbDir)) {
          await pExec(`mkdir -p ${thumbDir}`);
        }

        const header = `-headers "Authorization: Basic ${Buffer.from(`skibiditoilet:${process.env.MEDIAMTX_PUBLISH_KEY}`).toString('base64')}\r\n" `;
        
        try {
          await pExec(
            `ffmpeg ${header} -i ${m3u8location} -vframes 1 -an -y -f image2 ${thumbDir}/${name}.webp`
          );
          return { success: true };
        } catch (ffmpegError) {
          console.error(`FFmpeg error for ${name} on server ${server}:`, ffmpegError);
          return { success: false, error: ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError) };
        }
      } catch (e) {
        console.error('Thumbnail generation failed:', e);
        // @ts-ignore e is unknown
        return { success: false, error: e.message };
      }
    },
    {
      connection: getRedisConnection().options,
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
