import getLiveThumb from './getLiveThumb';
import { emojisWriteRedis } from './emojisWriteRedis';
import streamInfoRunner from './streamInfo';
import syncStreamKeys from './syncStreamKeys';
import writeSessions from './writeSessions';
import { viewerCountSync } from './viewerCountSync';
import { registerWorkers } from './registerWorkers';

// same order and semantics as the old Next instrumentation.ts register()
export async function startJobs() {
  await streamInfoRunner();
  await writeSessions();
  await syncStreamKeys();

  await registerWorkers();
  console.log('bullmq workers registered');

  const cron = (await import('node-cron')).default;
  if (process.env.NODE_ENV === 'production') {
    console.log('running production cron job scheduling');
    cron.schedule('*/3 * * * *', async () => {
      await getLiveThumb();
    });
  } else {
    console.log('running local cron job scheduling');
    setInterval(async () => {
      await getLiveThumb();
    }, 5000);
  }
  console.log('cron stuff registered');

  await emojisWriteRedis();

  setInterval(async () => {
    await viewerCountSync();
  }, 2000);
}
