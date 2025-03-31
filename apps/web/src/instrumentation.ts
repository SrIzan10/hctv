export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await (await import('@/lib/instrumentation/streamInfo')).default();
  }
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerWorkers } = await import('@/lib/workers/register');

    await registerWorkers();

    console.log('pgboss workers registered');
  }
}
