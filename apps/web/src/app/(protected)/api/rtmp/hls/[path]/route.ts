import { validateRequest } from '@/lib/auth/validate';
import fsP from 'fs/promises';
import fs from 'fs'; 

export async function GET(request: Request, { params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const { user } = await validateRequest();
  if (!user) {
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
