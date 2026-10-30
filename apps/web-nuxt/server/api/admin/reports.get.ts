import {
  AdminAuditAction,
  ChatModerationAction,
  ChatReportAction,
  ChatReportStatus,
  getRedisConnection,
  prisma,
} from '@hctv/db';

const redis = getRedisConnection();
const REPORT_ALREADY_HANDLED_ERROR = 'REPORT_ALREADY_HANDLED';
const NO_ACTIVE_CHAT_BAN_ERROR = 'NO_ACTIVE_CHAT_BAN';
const NO_ACTIVE_PLATFORM_BAN_ERROR = 'NO_ACTIVE_PLATFORM_BAN';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const { user } = await validateRequest();
  if (!user?.isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
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
});
