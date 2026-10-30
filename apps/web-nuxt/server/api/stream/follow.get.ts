import { getNotificationQueue } from '../../utils/jobs/queues';
import { prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
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

  return Response.json({ following: isFollowing }, { status: 200 });
});
