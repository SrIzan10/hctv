import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
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
        select: { id: true, slack_id: true, pfpUrl: true, personalChannel: { select: { name: true } } },
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
}

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await request.json();
  const { channelId, action, reason, expiresAt } = body as {
    channelId: string;
    action: 'restrict' | 'unrestrict';
    reason?: string;
    expiresAt?: string;
  };

  if (!channelId || !action) {
    return new Response('Missing required fields', { status: 400 });
  }

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) {
    return new Response('Channel not found', { status: 404 });
  }

  if (action === 'restrict') {
    if (!reason) {
      return new Response('Reason is required for restricting', { status: 400 });
    }

    await prisma.channelRestriction.upsert({
      where: { channelId },
      update: {
        reason,
        restrictedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      create: {
        channelId,
        reason,
        restrictedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return Response.json({ success: true, message: 'Channel restricted' });
  }

  if (action === 'unrestrict') {
    await prisma.channelRestriction.delete({ where: { channelId } }).catch(() => { });
    return Response.json({ success: true, message: 'Channel unrestricted' });
  }

  return new Response('Invalid action', { status: 400 });
}
