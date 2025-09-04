import * as Sentry from "@sentry/nextjs";

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

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { viewerCountSync } = await import('@/lib/instrumentation/viewerCountSync');
    setInterval(async () => {
      await viewerCountSync();
    }, 2000);
  }
  
  Sentry.init({
    dsn: "https://f3c26671c39af48406c6e23702a4f3dd@o4506961023860736.ingest.us.sentry.io/4509895816773632",
  
    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,
  
    // Enable logs to be sent to Sentry
    enableLogs: true,
  
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    
    integrations: [
      Sentry.extraErrorDataIntegration(),
    ],
  });
}
