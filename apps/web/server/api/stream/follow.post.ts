import { getNotificationQueue } from '../../utils/jobs/queues';
import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const { user } = await validateRequest();
  const queue = getNotificationQueue();
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

    await queue.add(`newFollow:${username}`, {
      text: `You started following \`${username}\`!\n_Stream notifications are disabled by default. If you want to enable them, you can do so in \`Profile > Notifications\`._`,
      channel: user.slack_id,
    });
  }

  return Response.json({ following: !isFollowing }, { status: 200 });
});
