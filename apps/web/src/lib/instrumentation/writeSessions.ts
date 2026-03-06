import { getRedisConnection, prisma } from '@hctv/db';
import { trackWebJob } from '../metrics';

export default async function writeSessions() {
  return trackWebJob('write_sessions', async () => {
    const sessions = await prisma.session.findMany();
    const sessionIds = sessions.map((session) => session.id);

    const redis = getRedisConnection();
    const multi = redis.multi();
    multi.del('sessions:*');
    for (const sessionId of sessionIds) {
      multi.set(`sessions:${sessionId}`, '');
    }
    await multi.exec();

    console.log('Sessions written to Redis');
  });
}
