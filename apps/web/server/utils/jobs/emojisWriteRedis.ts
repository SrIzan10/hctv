import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getRedisConnection } from '@hctv/db';
import bundledEmojis from './emojis.json';

export async function emojisWriteRedis() {
  const startTime = performance.now();
  const redis = getRedisConnection();
  const emojis = await loadEmojis();

  // janky way to remove not existing emojis,
  // just obliterate the emojis hash and rewrite it lol help
  await redis.del('emojis');
  for (const [name, url] of Object.entries(emojis)) {
    await redis.hset('emojis', name, url);
  }

  const endTime = performance.now();
  console.log(`Finished writing emojis to Redis in ${(endTime - startTime).toFixed(2)}ms`);
}

// the image build drops a freshly generated emojis.json next to the app; prefer it and only
// fall back to the copy bundled into the server build
async function loadEmojis(): Promise<Record<string, string>> {
  console.log('Writing emojis to Redis...');
  const possiblePaths = [
    '/app/emojis.json',
    path.join(process.cwd(), 'emojis.json'),
    path.join(process.cwd(), 'apps/web/emojis.json'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      console.log(`Found emojis at: ${p}`);
      return JSON.parse(await readFile(p, 'utf-8')) as Record<string, string>;
    }
  }

  console.log('Using bundled emojis.json');
  return bundledEmojis as Record<string, string>;
}
