import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { notFound, redirect } from 'next/navigation';
import ReportCasePageClient from './page.client';

export default async function ReportCasePage({ params }: ReportCasePageProps) {
  const { reportId } = await params;
  const { user } = await validateRequest();

  if (!user) {
    redirect('/auth/hackclub');
  }

  if (!user.isAdmin) {
    redirect('/');
  }

  const report = await prisma.chatUserReport.findUnique({
    where: {
      id: reportId,
    },
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
          ban: true,
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

  if (!report) {
    notFound();
  }

  return (
    <ReportCasePageClient
      report={{
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
      }}
    />
  );
}

interface ReportCasePageProps {
  params: Promise<{
    reportId: string;
  }>;
}
