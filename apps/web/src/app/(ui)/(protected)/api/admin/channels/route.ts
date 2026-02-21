import { validateRequest } from '@/lib/auth/validate';
import { AdminAuditAction, prisma } from '@hctv/db';
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
}

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: {
    channelId: string;
    action: 'restrict' | 'unrestrict';
    reason?: string;
    expiresAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { channelId, action, reason, expiresAt } = body;

  if (!channelId || !action) {
    return new Response('Missing required fields', { status: 400 });
  }

  let expiresAtDate: Date | null = null;
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return new Response('Invalid expiresAt date', { status: 400 });
    }
    if (expiresAtDate <= new Date()) {
      return new Response('expiresAt must be a future date', { status: 400 });
    }
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
        expiresAt: expiresAtDate,
      },
      create: {
        channelId,
        reason,
        restrictedBy: user.id,
        expiresAt: expiresAtDate,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.CHANNEL_RESTRICTED,
        actorId: user.id,
        targetChannel: channel.name,
        reason,
        details: {
          channelId,
          expiresAt: expiresAtDate?.toISOString() ?? null,
        } as any,
      },
    });

    return Response.json({ success: true, message: 'Channel restricted' });
  }

  if (action === 'unrestrict') {
    const deleted = await prisma.channelRestriction.deleteMany({ where: { channelId } });
    if (deleted.count === 0) {
      return new Response('Channel does not have an active restriction', { status: 400 });
    }

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.CHANNEL_UNRESTRICTED,
        actorId: user.id,
        targetChannel: channel.name,
        details: {
          channelId,
        } as any,
      },
    });

    return Response.json({ success: true, message: 'Channel unrestricted' });
  }

  return new Response('Invalid action', { status: 400 });
}
