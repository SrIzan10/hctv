import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const streamKey = formData.get('name')?.toString() || '';

  const key = await prisma.streamKey.findFirst({
    where: {
      key: streamKey,
    },
    include: {
      channel: true,
    },
  });

  if (!key) {
    return new Response('nay', {
      status: 403,
    });
  }
  return new Response('', {
    status: 302,
    headers: {
      'Location': key.channel.name,
    },
  });
}