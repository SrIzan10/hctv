import { getRedisConnection } from '@hctv/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function emojisWriteRedis() {
  const startTime = performance.now();
  const fileLocation = getPath();
  const redis = getRedisConnection();

  const emojisFile = await readFile(fileLocation, 'utf-8');
  const emojis = JSON.parse(emojisFile) as Record<string, string>;

  // janky way to remove not existing emojis,
  // just obliterate the emojis hash and rewrite it lol help
  await redis.del('emojis');
  for (const [name, url] of Object.entries(emojis)) {
    await redis.hset('emojis', name, url);
  }

  const endTime = performance.now();
  console.log(`Finished writing emojis to Redis in ${(endTime - startTime).toFixed(2)}ms`);
}

function getPath() {
  const possiblePaths = [
    // original
    'src/lib/instrumentation/emojis.json',
    // relative
    path.join(__dirname, 'emojis.json'),
    // standalone nextjs
    path.join(process.cwd(), 'src/lib/instrumentation/emojis.json'),
    // docker build context
    path.join(process.cwd(), 'emojis.json'),
    // other alternatives
    './emojis.json',
    './src/lib/instrumentation/emojis.json',
  ];
  console.log('Writing emojis to Redis...');

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      console.log(`Found emojis at: ${p}`);
      return p;
    }
  }

  throw new Error('emojis json not found anywhere');
}