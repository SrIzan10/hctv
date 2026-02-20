import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const take = Math.min(Math.max(Number(searchParams.get('take') ?? 100), 10), 250);

  const [adminLogs, chatLogs] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          include: {
            personalChannel: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.chatModerationEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        channel: {
          select: {
            name: true,
          },
        },
        moderator: {
          include: {
            personalChannel: {
              select: {
                name: true,
              },
            },
          },
        },
        targetUser: {
          include: {
            personalChannel: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const targetUserIds = [
    ...new Set(adminLogs.map((log) => log.targetUserId).filter(Boolean)),
  ] as string[];
  const targetUsers =
    targetUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: targetUserIds,
            },
          },
          include: {
            personalChannel: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];
  const targetUserMap = new Map(
    targetUsers.map((targetUser) => [
      targetUser.id,
      targetUser.personalChannel?.name ?? targetUser.slack_id,
    ])
  );

  const normalizedAdminLogs = adminLogs.map((log) => ({
    id: log.id,
    source: 'platform' as const,
    action: log.action,
    createdAt: log.createdAt,
    actor: log.actor.personalChannel?.name ?? log.actor.slack_id,
    target:
      log.targetChannel ??
      (log.targetUserId ? (targetUserMap.get(log.targetUserId) ?? log.targetUserId) : null),
    reason: log.reason,
    details: log.details,
  }));

  const normalizedChatLogs = chatLogs.map((log) => ({
    id: log.id,
    source: 'chat' as const,
    action: log.action,
    createdAt: log.createdAt,
    actor: log.moderator.personalChannel?.name ?? log.moderator.slack_id,
    target: log.targetUser?.personalChannel?.name ?? log.channel.name,
    reason: log.reason,
    details: log.details,
    channelName: log.channel.name,
  }));

  const logs = [...normalizedAdminLogs, ...normalizedChatLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, take);

  return Response.json(logs);
}
