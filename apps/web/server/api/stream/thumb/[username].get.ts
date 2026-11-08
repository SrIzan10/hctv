import fsP from 'fs/promises';
import fs from 'fs';

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username') ?? '';
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
});
