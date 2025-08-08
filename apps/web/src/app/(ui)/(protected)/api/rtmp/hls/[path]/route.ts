import fsP from 'fs/promises';
import fs from 'fs'; 
import { getRedisConnection } from '@hctv/db';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const c = await cookies();
  if (!getRedisConnection().exists(`sessions:${c.get('auth_session')?.value}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (path.includes('..')) {
    return new Response("nuh uh", { status: 403 });
  }

  const basePath = '/dev/shm/hls';
  const filePath = `${basePath}/${path}`;
  const exists = fs.existsSync(filePath);

  if (!exists) {
    return new Response("Not Found", { status: 404 });
  }

  const file = await fsP.readFile(filePath);
  return new Response(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}
