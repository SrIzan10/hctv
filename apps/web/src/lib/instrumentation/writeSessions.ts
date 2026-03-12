import { getRedisConnection, prisma } from '@hctv/db';
import { setCacheEntryCount, trackWebJob } from '../metrics';

async function deleteSessionKeys() {
  const redis = getRedisConnection();
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'sessions:*', 'COUNT', 200);
    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.unlink(...keys);
    }
  } while (cursor !== '0');
}

export default async function writeSessions() {
  return trackWebJob('write_sessions', async () => {
    const sessions = await prisma.session.findMany();
    const sessionIds = sessions.map((session) => session.id);

    await deleteSessionKeys();

    const redis = getRedisConnection();
    const multi = redis.multi();
    for (const sessionId of sessionIds) {
      multi.set(`sessions:${sessionId}`, '');
    }
    await multi.exec();
    setCacheEntryCount('sessions', sessionIds.length);

    console.log('Sessions written to Redis');
  });
}
