import { validateRequest } from '@/lib/auth/validate';
import { getPgBoss } from '@/lib/workers';
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
  const channelOwner = await prisma.channel.findFirst({
    where: {
      name: username,
    }
  })
  if (!channelOwner) {
    return new Response('Not Found', { status: 404 });
  }
  if (channelOwner.ownerId === user.id) {
    return new Response('you are of course not able to follow yourself', { status: 418 });
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
  const boss = await getPgBoss();
  const searchParams = new URL(request.url).searchParams;
  const username = searchParams.get('username');
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!username) {
    return new Response('Bad Request', { status: 400 });
  }
  const channelOwner = await prisma.channel.findFirst({
    where: {
      name: username,
    }
  })
  if (!channelOwner) {
    return new Response('Not Found', { status: 404 });
  }
  if (channelOwner.ownerId === user.id) {
    return new Response('you are of course not able to follow yourself', { status: 418 });
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

    const jobId = await boss.send('notifier:sendMsg', {
      text: `You started following \`${username}\`!\n_Stream notifications are enabled by default. If you want to disable them, you can do so in \`Profile > Notifications\`._`,
      channel: user.slack_id,
    });
    
    console.log(`Job sent with ID: ${jobId} for user ${user.id} following ${username}`);
  }

  return new Response(JSON.stringify({ following: !isFollowing }), { status: 200 });
}
