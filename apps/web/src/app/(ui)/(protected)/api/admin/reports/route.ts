import { validateRequest } from '@/lib/auth/validate';
import {
  AdminAuditAction,
  ChatModerationAction,
  ChatReportAction,
  ChatReportStatus,
  getRedisConnection,
  prisma,
} from '@hctv/db';
import { NextRequest } from 'next/server';

const redis = getRedisConnection();
const REPORT_ALREADY_HANDLED_ERROR = 'REPORT_ALREADY_HANDLED';
const NO_ACTIVE_CHAT_BAN_ERROR = 'NO_ACTIVE_CHAT_BAN';
const NO_ACTIVE_PLATFORM_BAN_ERROR = 'NO_ACTIVE_PLATFORM_BAN';

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const take = Math.min(Math.max(Number(searchParams.get('take') ?? 100), 10), 250);
  const reportId = searchParams.get('reportId')?.trim();

  const reports = await prisma.chatUserReport.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      channel: {
        select: {
          name: true,
        },
      },
      reporter: {
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
      handledBy: {
        include: {
          personalChannel: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const normalizedReports = reports.map((report) => ({
    id: report.id,
    status: report.status,
    reason: report.reason,
    reportedMessage: report.reportedMessage,
    reportedMessageId: report.reportedMessageId,
    targetUsername: report.targetUsername,
    channelName: report.channel.name,
    createdAt: report.createdAt,
    handledAt: report.handledAt,
    handlingNote: report.handlingNote,
    lastAction: report.lastAction,
    reporter: report.reporter.personalChannel?.name ?? report.reporter.slack_id,
    handledBy: report.handledBy?.personalChannel?.name ?? report.handledBy?.slack_id ?? null,
    target:
      report.targetUser?.personalChannel?.name ??
      report.targetUsername ??
      report.targetUserId ??
      'unknown',
  }));

  return Response.json({
    reports: normalizedReports,
    reportId,
  });
}

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: {
    reportId?: string;
    action?:
      | 'review'
      | 'dismiss'
      | 'delete_reported_message'
      | 'timeout_10m'
      | 'timeout_1h'
      | 'ban_chat'
      | 'lift_chat_ban'
      | 'ban_platform'
      | 'unban_platform';
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const reportId = body.reportId?.trim();
  const action = body.action;
  const note = body.note?.trim() || null;

  if (!reportId || !action) {
    return new Response('Missing required fields', { status: 400 });
  }

  const report = await prisma.chatUserReport.findUnique({
    where: { id: reportId },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          isAdmin: true,
        },
      },
    },
  });

  if (!report) {
    return new Response('Report not found', { status: 404 });
  }

  const targetUserId = report.targetUserId ?? report.targetUser?.id ?? null;
  const isTargetAdmin = Boolean(report.targetUser?.isAdmin);

  if (
    (action === 'ban_platform' ||
      action === 'ban_chat' ||
      action === 'timeout_10m' ||
      action === 'timeout_1h') &&
    isTargetAdmin
  ) {
    return new Response('Cannot enforce this action on an admin user', { status: 400 });
  }

  const reportPatchBase = {
    handledById: user.id,
    handledAt: new Date(),
    handlingNote: note,
  };

  if (action === 'review') {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.chatUserReport.updateMany({
          where: { id: reportId, status: ChatReportStatus.OPEN },
          data: {
            ...reportPatchBase,
            status: ChatReportStatus.REVIEWED,
            lastAction: ChatReportAction.REVIEW,
          },
        });
        if (claimed.count === 0) {
          throw new Error(REPORT_ALREADY_HANDLED_ERROR);
        }

        await tx.adminAuditLog.create({
          data: {
            action: AdminAuditAction.REPORT_REVIEWED,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
            } as any,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === REPORT_ALREADY_HANDLED_ERROR) {
        return new Response('Report has already been handled', { status: 409 });
      }
      throw error;
    }

    return Response.json({ success: true });
  }

  if (action === 'dismiss') {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.chatUserReport.updateMany({
          where: { id: reportId, status: ChatReportStatus.OPEN },
          data: {
            ...reportPatchBase,
            status: ChatReportStatus.DISMISSED,
            lastAction: ChatReportAction.DISMISS,
          },
        });
        if (claimed.count === 0) {
          throw new Error(REPORT_ALREADY_HANDLED_ERROR);
        }

        await tx.adminAuditLog.create({
          data: {
            action: AdminAuditAction.REPORT_DISMISSED,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
            } as any,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === REPORT_ALREADY_HANDLED_ERROR) {
        return new Response('Report has already been handled', { status: 409 });
      }
      throw error;
    }

    return Response.json({ success: true });
  }

  if (action === 'delete_reported_message') {
    if (!report.reportedMessageId) {
      return new Response('No reported message id available for this report', { status: 400 });
    }

    const channelKey = `chat:history:${report.channel.name}`;
    const history = await redis.zrange(channelKey, 0, -1);
    let deleted = false;

    for (const entry of history) {
      try {
        const parsed = JSON.parse(entry) as { msgId?: string };
        if (parsed.msgId === report.reportedMessageId) {
          await redis.zrem(channelKey, entry);
          deleted = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!deleted) {
      return new Response('Reported message was not found in chat history', { status: 404 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.chatUserReport.updateMany({
          where: { id: reportId, status: ChatReportStatus.OPEN },
          data: {
            ...reportPatchBase,
            status: ChatReportStatus.REVIEWED,
            lastAction: ChatReportAction.DELETE_REPORTED_MESSAGE,
          },
        });
        if (claimed.count === 0) {
          throw new Error(REPORT_ALREADY_HANDLED_ERROR);
        }

        await tx.chatModerationEvent.create({
          data: {
            action: ChatModerationAction.MESSAGE_DELETED,
            channelId: report.channel.id,
            moderatorId: user.id,
            targetUserId,
            reason: note ?? 'Message deleted from report review',
            details: {
              reportId,
              msgId: report.reportedMessageId,
            } as any,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            action: AdminAuditAction.REPORT_ENFORCEMENT,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
              enforcement: 'DELETE_REPORTED_MESSAGE',
              msgId: report.reportedMessageId,
            } as any,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === REPORT_ALREADY_HANDLED_ERROR) {
        return new Response('Report has already been handled', { status: 409 });
      }
      throw error;
    }

    return Response.json({ success: true });
  }

  if (!targetUserId) {
    return new Response('Report target is unavailable', { status: 400 });
  }

  if (
    action === 'timeout_10m' ||
    action === 'timeout_1h' ||
    action === 'ban_chat' ||
    action === 'lift_chat_ban'
  ) {
    const timeoutSeconds = action === 'timeout_10m' ? 600 : action === 'timeout_1h' ? 3600 : null;
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.chatUserReport.updateMany({
          where: { id: reportId, status: ChatReportStatus.OPEN },
          data: {
            ...reportPatchBase,
            status: ChatReportStatus.REVIEWED,
            lastAction:
              action === 'timeout_10m'
                ? ChatReportAction.TIMEOUT_10M
                : action === 'timeout_1h'
                  ? ChatReportAction.TIMEOUT_1H
                  : action === 'ban_chat'
                    ? ChatReportAction.BAN_CHAT
                    : ChatReportAction.LIFT_CHAT_BAN,
          },
        });
        if (claimed.count === 0) {
          throw new Error(REPORT_ALREADY_HANDLED_ERROR);
        }

        if (action === 'lift_chat_ban') {
          const deleted = await tx.chatUserBan.deleteMany({
            where: {
              channelId: report.channel.id,
              userId: targetUserId,
            },
          });
          if (deleted.count === 0) {
            throw new Error(NO_ACTIVE_CHAT_BAN_ERROR);
          }
        } else {
          await tx.chatUserBan.upsert({
            where: {
              channelId_userId: {
                channelId: report.channel.id,
                userId: targetUserId,
              },
            },
            create: {
              channelId: report.channel.id,
              userId: targetUserId,
              bannedById: user.id,
              reason: note ?? report.reason,
              expiresAt: timeoutSeconds ? new Date(Date.now() + timeoutSeconds * 1000) : null,
            },
            update: {
              bannedById: user.id,
              reason: note ?? report.reason,
              expiresAt: timeoutSeconds ? new Date(Date.now() + timeoutSeconds * 1000) : null,
            },
          });
        }

        await tx.chatModerationEvent.create({
          data: {
            action:
              action === 'lift_chat_ban'
                ? ChatModerationAction.USER_UNBANNED
                : action === 'ban_chat'
                  ? ChatModerationAction.USER_BANNED
                  : ChatModerationAction.USER_TIMEOUT,
            channelId: report.channel.id,
            moderatorId: user.id,
            targetUserId,
            reason: note ?? report.reason,
            details:
              timeoutSeconds === null
                ? ({ reportId } as any)
                : ({ reportId, durationSeconds: timeoutSeconds } as any),
          },
        });

        await tx.adminAuditLog.create({
          data: {
            action: AdminAuditAction.REPORT_ENFORCEMENT,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
              enforcement:
                action === 'timeout_10m'
                  ? 'TIMEOUT_10M'
                  : action === 'timeout_1h'
                    ? 'TIMEOUT_1H'
                    : action === 'ban_chat'
                      ? 'BAN_CHAT'
                      : 'LIFT_CHAT_BAN',
            } as any,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === REPORT_ALREADY_HANDLED_ERROR) {
        return new Response('Report has already been handled', { status: 409 });
      }
      if (error instanceof Error && error.message === NO_ACTIVE_CHAT_BAN_ERROR) {
        return new Response('User does not have an active chat ban for this channel', {
          status: 400,
        });
      }
      throw error;
    }

    return Response.json({ success: true });
  }

  if (action === 'ban_platform' || action === 'unban_platform') {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.chatUserReport.updateMany({
          where: { id: reportId, status: ChatReportStatus.OPEN },
          data: {
            ...reportPatchBase,
            status: ChatReportStatus.REVIEWED,
            lastAction:
              action === 'ban_platform'
                ? ChatReportAction.BAN_PLATFORM
                : ChatReportAction.UNBAN_PLATFORM,
          },
        });
        if (claimed.count === 0) {
          throw new Error(REPORT_ALREADY_HANDLED_ERROR);
        }

        if (action === 'ban_platform') {
          await tx.userBan.upsert({
            where: { userId: targetUserId },
            update: {
              reason: note ?? report.reason,
              bannedBy: user.id,
              expiresAt: null,
            },
            create: {
              userId: targetUserId,
              reason: note ?? report.reason,
              bannedBy: user.id,
              expiresAt: null,
            },
          });
        } else {
          const deleted = await tx.userBan.deleteMany({ where: { userId: targetUserId } });
          if (deleted.count === 0) {
            throw new Error(NO_ACTIVE_PLATFORM_BAN_ERROR);
          }
        }

        await tx.adminAuditLog.create({
          data: {
            action:
              action === 'ban_platform'
                ? AdminAuditAction.USER_BANNED
                : AdminAuditAction.USER_UNBANNED,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
              source: 'CHAT_REPORT',
            } as any,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            action: AdminAuditAction.REPORT_ENFORCEMENT,
            actorId: user.id,
            targetUserId,
            targetChannel: report.channel.name,
            reason: note,
            details: {
              reportId,
              enforcement: action === 'ban_platform' ? 'BAN_PLATFORM' : 'UNBAN_PLATFORM',
            } as any,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === REPORT_ALREADY_HANDLED_ERROR) {
        return new Response('Report has already been handled', { status: 409 });
      }
      if (error instanceof Error && error.message === NO_ACTIVE_PLATFORM_BAN_ERROR) {
        return new Response('User does not have an active platform ban', { status: 400 });
      }
      throw error;
    }

    return Response.json({ success: true });
  }

  return new Response('Invalid action', { status: 400 });
}
