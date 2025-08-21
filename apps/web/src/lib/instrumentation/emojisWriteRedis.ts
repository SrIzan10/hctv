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
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  
  // List files in current directory
  try {
    const files = require('fs').readdirSync(process.cwd());
    console.log('Files in cwd:', files);
  } catch (e) {
    // @ts-ignore
    console.log('Could not list files in cwd:', e.message);
  }

  const possiblePaths = [
    // Explicit Docker container path
    '/app/emojis.json',
    '/app/apps/web/emojis.json',
    // Current paths
    path.join(process.cwd(), 'emojis.json'),
    path.join(process.cwd(), 'apps/web/emojis.json'),
    // Fallbacks
    './emojis.json',
    'src/lib/instrumentation/emojis.json',
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