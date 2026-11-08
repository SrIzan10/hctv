import { AdminAuditAction, prisma } from '@hctv/db';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const search = searchParams.get('search') || '';

  const channels = await prisma.channel.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      restriction: true,
      owner: {
        select: {
          id: true,
          slack_id: true,
          pfpUrl: true,
          personalChannel: { select: { name: true } },
        },
      },
      personalFor: {
        select: {
          id: true,
        },
      },
    },
    take: 50,
  });
  return Response.json(channels);
});
