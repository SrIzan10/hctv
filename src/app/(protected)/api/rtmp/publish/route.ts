import prisma from '@/lib/db';
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const streamKey = formData.get('name')?.toString() || '';
  console.log('streamKey:', streamKey);

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

  const headers = new Headers();
  headers.append('Location', `rtmp://127.0.0.1/channel-live/${key.channel.name}`);
  
  return new Response(null, {
    status: 302,
    headers: headers,
  });
}