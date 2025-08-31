import fsP from 'fs/promises';
import fs from 'fs'; 
import { getRedisConnection } from '@hctv/db';
import { cookies } from 'next/headers';

type HLSPathParams = {
  path: string;
};
type HLSResponse = ArrayBuffer | string;

/**
 * Serve HLS segments
 * @description Serves HLS segments from /dev/shm/hls. Requires a valid auth_session cookie.
 * @pathParams HLSPathParams
 * @response HLSResponse
 * @openapi
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const c = await cookies();
  
  const sessionCookie = c.get('auth_session')?.value;
  if (!sessionCookie) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sessionExists = await getRedisConnection().exists(`sessions:${sessionCookie}`);
  if (sessionExists === 0) {
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
