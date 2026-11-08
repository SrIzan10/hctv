import { AdminAuditAction, getRedisConnection, prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const search = searchParams.get('search') || '';

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { slack_id: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { personalChannel: { name: { contains: search, mode: 'insensitive' } } },
          ],
          hasOnboarded: true,
        }
      : undefined,
    select: {
      id: true,
      slack_id: true,
      email: true,
      pfpUrl: true,
      isAdmin: true,
      bypassVerification: true,
      ban: true,
      personalChannel: { select: { name: true } },
    },
    take: 50,
  });
  return Response.json(users);
});
