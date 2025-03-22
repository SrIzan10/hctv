import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  const searchParams = new URL(request.url).searchParams;
  const username = searchParams.get('username');
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!username) {
    return new Response('Bad Request', { status: 400 });
  }

  const isFollowing =
    (await prisma.follow.count({
      where: {
        channel: {
          name: username,
        },
        user: {
          id: user.id,
        },
      },
    })) > 0;

  return new Response(JSON.stringify({ following: isFollowing }), { status: 200 });
}

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  const searchParams = new URL(request.url).searchParams;
  const username = searchParams.get('username');
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!username) {
    return new Response('Bad Request', { status: 400 });
  }

  const isFollowing =
    (await prisma.follow.count({
      where: {
        channel: {
          name: username,
        },
        user: {
          id: user.id,
        },
      },
    })) > 0;

  if (isFollowing) {
    await prisma.follow.deleteMany({
      where: {
        channel: {
          name: username,
        },
        user: {
          id: user.id,
        },
      },
    });
  } else {
    await prisma.follow.create({
      data: {
        channel: {
          connect: {
            name: username,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  }

  return new Response(JSON.stringify({ following: !isFollowing }), { status: 200 });
}
