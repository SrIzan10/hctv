import { validateRequest } from '@/lib/auth/validate';
import { prisma, getRedisConnection } from '@hctv/db';
import { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX_REPORTS = 5;

export async function POST(request: NextRequest) {
  const { user } = await validateRequest();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: {
    channelName?: string;
    targetUserId?: string;
    targetUsername?: string;
    msgId?: string;
    message?: string;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

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

  const redis = getRedisConnection();
  const rateLimitKey = `report_rl:${user.id}`;
  const currentCount = await redis.incr(rateLimitKey);
  if (currentCount === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  }
  if (currentCount > RATE_LIMIT_MAX_REPORTS) {
    return new Response('Too many reports submitted. Please wait before submitting more.', {
      status: 429,
    });
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

  const msgId = body.msgId?.trim() || null;
  const duplicateCheck = await prisma.chatUserReport.findFirst({
    where: {
      channelId: channel.id,
      reporterId: user.id,
      targetUserId: targetUser.id,
      reportedMessageId: msgId,
      status: 'OPEN',
    },
    select: { id: true },
  });

  if (duplicateCheck) {
    return new Response('You have already submitted an open report for this message.', {
      status: 409,
    });
  }

  await prisma.chatUserReport.create({
    data: {
      channelId: channel.id,
      reporterId: user.id,
      targetUserId: targetUser.id,
      targetUsername: body.targetUsername?.trim() || targetUser.personalChannel?.name || null,
      reportedMessageId: msgId,
      reportedMessage: body.message?.trim().slice(0, 1000) || null,
      reason,
    },
  });

  return Response.json({ success: true });
}
