import { validateRequest } from '@/lib/auth/validate';
import fsP from 'fs/promises';
import fs from 'fs';

type ThumbPathParams = {
  username: string;
};
type ThumbResponse = Buffer<ArrayBufferLike> | string;

/**
 * Serve user thumbnail
 * @description Serves user thumbnails. Requires authentication.
 * @pathParams ThumbPathParams
 * @response ThumbResponse
 * @openapi
 */
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { user } = await validateRequest();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (username.includes('..')) {
    return new Response("nuh uh", { status: 403 });
  }

  const filePath = `/dev/shm/hctv-thumb/${username}.webp`;

  if (!fs.existsSync(filePath)) {
    return new Response("Not Found", { status: 404 });
  }

  const fileContent = await fsP.readFile(filePath);
  return new Response(fileContent, {
    headers: {
      'Content-Type': 'image/webp',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}