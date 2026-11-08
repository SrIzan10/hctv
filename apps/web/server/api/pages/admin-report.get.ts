import { prisma } from '@hctv/db';

// admin/reports/[reportId]/page.tsx: ?id=<reportId>. 401/403 via requireAdmin, 404 when unknown
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = getQuery(event);
  if (typeof id !== 'string' || !id) {
    throw createError({ statusCode: 404, statusMessage: 'Report not found' });
  }

  const personalChannel = { select: { name: true } };
  const report = await prisma.chatUserReport.findUnique({
    where: { id },
    include: {
      channel: { select: { name: true } },
      reporter: { include: { personalChannel } },
      targetUser: { include: { personalChannel, ban: true } },
      handledBy: { include: { personalChannel } },
    },
  });

  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Report not found' });
  }

  return {
    id: report.id,
    status: report.status,
    reason: report.reason,
    reportedMessage: report.reportedMessage,
    reportedMessageId: report.reportedMessageId,
    targetUsername: report.targetUsername,
    channelName: report.channel.name,
    createdAt: report.createdAt.toISOString(),
    handledAt: report.handledAt?.toISOString() ?? null,
    handlingNote: report.handlingNote,
    lastAction: report.lastAction,
    reporter: report.reporter.personalChannel?.name ?? report.reporter.slack_id,
    target:
      report.targetUser?.personalChannel?.name ??
      report.targetUsername ??
      report.targetUserId ??
      'unknown',
    targetUserId: report.targetUserId,
    targetIsAdmin: Boolean(report.targetUser?.isAdmin),
    targetIsPlatformBanned: Boolean(report.targetUser?.ban),
    handledBy: report.handledBy?.personalChannel?.name ?? report.handledBy?.slack_id ?? null,
  };
});
