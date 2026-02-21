import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await request.json()) as {
    channelName?: string;
    targetUserId?: string;
    targetUsername?: string;
    msgId?: string;
    message?: string;
    reason?: string;
  };

  const channelName = body.channelName?.trim();
  const targetUserId = body.targetUserId?.trim();
  const reason = body.reason?.trim();

  if (!channelName || !targetUserId || !reason) {
    return new Response('Missing required fields', { status: 400 });
  }

  if (targetUserId === user.id) {
    return new Response('You cannot report yourself', { status: 400 });
  }

  if (reason.length < 10 || reason.length > 1000) {
    return new Response('Reason must be between 10 and 1000 characters', { status: 400 });
  }

  const [channel, targetUser] = await Promise.all([
    prisma.channel.findUnique({
      where: { name: channelName },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, personalChannel: { select: { name: true } } },
    }),
  ]);

  if (!channel) {
    return new Response('Channel not found', { status: 404 });
  }

  if (!targetUser) {
    return new Response('Target user not found', { status: 404 });
  }

  await prisma.chatUserReport.create({
    data: {
      channelId: channel.id,
      reporterId: user.id,
      targetUserId: targetUser.id,
      targetUsername: body.targetUsername?.trim() || targetUser.personalChannel?.name || null,
      reportedMessageId: body.msgId?.trim() || null,
      reportedMessage: body.message?.trim().slice(0, 1000) || null,
      reason,
    },
  });

  return Response.json({ success: true });
}
