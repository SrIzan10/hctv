import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const streamKey = formData.get('name');
  if (typeof streamKey !== 'string') {
    return new Response('bad request', {
      status: 400,
    });
  }

  const key = await prisma.streamKey.findFirst({
    where: {
      key: streamKey,
    },
    include: {
      channel: {
        include: {
          restriction: true,
          owner: {
            include: { ban: true },
          },
        },
      },
    },
  });

  if (!key) {
    return new Response('nay', {
      status: 403,
    });
  }

  if (key.channel.restriction) {
    const isExpired = key.channel.restriction.expiresAt &&
      new Date(key.channel.restriction.expiresAt) < new Date();
    if (!isExpired) {
      return new Response('channel restricted', { status: 403 });
    }
  }

  if (key.channel.owner?.ban) {
    const isExpired = key.channel.owner.ban.expiresAt &&
      new Date(key.channel.owner.ban.expiresAt) < new Date();
    if (!isExpired) {
      return new Response('user banned', { status: 403 });
    }
  }

  return new Response('', {
    status: 302,
    headers: {
      'Location': key.channel.name,
    },
  });
}