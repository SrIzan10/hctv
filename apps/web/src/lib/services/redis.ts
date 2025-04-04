import Redis from 'ioredis';

const createRedisConnection = () => {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
};

const globalForQueue = global as unknown as { 
  redisConnection: Redis | null;
};

if (!globalForQueue.redisConnection) {
  globalForQueue.redisConnection = null;
}

export function getRedisConnection(): Redis {
  if (!globalForQueue.redisConnection) {
    console.log('Creating new Redis connection...');
    globalForQueue.redisConnection = createRedisConnection();
  }
  return globalForQueue.redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  // Close Redis connection
  if (globalForQueue.redisConnection) {
    await globalForQueue.redisConnection.quit();
    globalForQueue.redisConnection = null;
    console.log('Redis connection closed');
  }
}