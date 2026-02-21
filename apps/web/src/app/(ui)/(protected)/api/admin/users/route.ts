import { validateRequest } from '@/lib/auth/validate';
import { verifySameOrigin } from '@/lib/auth/csrf';
import { AdminAuditAction, prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
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
    include: {
      ban: true,
      personalChannel: { select: { name: true } },
    },
    take: 50,
  });
  return Response.json(users);
}

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const csrfError = verifySameOrigin(request);
  if (csrfError) {
    return csrfError;
  }

  let body: {
    userId: string;
    action: 'ban' | 'unban' | 'promote' | 'demote';
    reason?: string;
    expiresAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { userId, action, reason, expiresAt } = body;

  if (!userId || !action) {
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

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return new Response('User not found', { status: 404 });
  }

  if (action === 'ban') {
    if (targetUser.isAdmin) {
      return new Response('Cannot ban an admin', { status: 400 });
    }

    if (!reason) {
      return new Response('Reason is required for banning', { status: 400 });
    }

    await prisma.userBan.upsert({
      where: { userId },
      update: {
        reason,
        bannedBy: user.id,
        expiresAt: expiresAtDate,
      },
      create: {
        userId,
        reason,
        bannedBy: user.id,
        expiresAt: expiresAtDate,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.USER_BANNED,
        actorId: user.id,
        targetUserId: userId,
        reason,
        details: {
          expiresAt: expiresAtDate?.toISOString() ?? null,
        } as any,
      },
    });

    return Response.json({ success: true, message: 'User banned' });
  }

  if (action === 'unban') {
    const deleted = await prisma.userBan.deleteMany({ where: { userId } });
    if (deleted.count === 0) {
      return new Response('User does not have an active platform ban', { status: 400 });
    }

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.USER_UNBANNED,
        actorId: user.id,
        targetUserId: userId,
      },
    });

    return Response.json({ success: true, message: 'User unbanned' });
  }

  if (action === 'promote') {
    if (targetUser.isAdmin) {
      return new Response('User is already an admin', { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.USER_PROMOTED,
        actorId: user.id,
        targetUserId: userId,
      },
    });

    return Response.json({ success: true, message: 'User promoted to admin' });
  }

  if (action === 'demote') {
    if (!targetUser.isAdmin) {
      return new Response('User is not an admin', { status: 400 });
    }

    if (targetUser.id === user.id) {
      return new Response('Cannot demote yourself', { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: false },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: AdminAuditAction.USER_DEMOTED,
        actorId: user.id,
        targetUserId: userId,
      },
    });

    return Response.json({ success: true, message: 'User demoted from admin' });
  }

  return new Response('Invalid action', { status: 400 });
}
