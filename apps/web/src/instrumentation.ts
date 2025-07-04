export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await (await import('@/lib/instrumentation/streamInfo')).default();
    await (await import('@/lib/instrumentation/writeSessions')).default();
  }
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerWorkers } = await import('@/lib/workers/register');
    await registerWorkers();
    console.log('bullmq workers registered');
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = (await import('node-cron')).default;

    const getLiveThumb = (await import('@/lib/instrumentation/getLiveThumb')).default;

    if (process.env.NODE_ENV === 'production') {
      console.log('running production cron job scheduling')
      cron.schedule('*/3 * * * *', async () => {
        await getLiveThumb();
      });
    } else {
      console.log('running local cron job scheduling')
      setInterval(async () => {
        await getLiveThumb();
      }, 5000);
    }
    console.log('cron stuff registered');
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { emojisWriteRedis } = await import('@/lib/instrumentation/emojisWriteRedis');
    await emojisWriteRedis();
  }
}
