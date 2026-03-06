import { ChatModerationAction, prisma } from '@hctv/db';
import { recordChatModerationAction } from '../metrics.js';
import type {
  ChatModerationCommand,
  ChatRestrictionState,
  ChatSocket,
  ChatUser,
} from '../types/chat.js';

const ROLE_RANK: Record<NonNullable<ChatUser['channelRole']> | '__none__', number> = {
  owner: 100,
  manager: 50,
  chatModerator: 10,
  botModerator: 10,
  __none__: 0,
};

function roleRank(role: ChatUser['channelRole']): number {
  return role ? (ROLE_RANK[role] ?? 0) : ROLE_RANK.__none__;
}

type ModerationContext = {
  chatUser: ChatUser;
  targetUsername: string;
  channelId: string;
};

type DeleteMessageDeps = {
  deleteMessageFromHistory: (targetUsername: string, msgId: string) => Promise<boolean>;
  logModerationEvent: (payload: {
    action: ChatModerationAction;
    channelId: string;
    moderatorId: string;
    targetUserId?: string;
    reason?: string;
    details?: Record<string, unknown>;
  }) => Promise<void>;
  broadcastToChannel: (
    targetUsername: string,
    ws: ChatSocket,
    payload: Record<string, unknown>
  ) => void;
};

type UserRestrictionDeps = {
  logModerationEvent: (payload: {
    action: ChatModerationAction;
    channelId: string;
    moderatorId: string;
    targetUserId?: string;
    reason?: string;
    details?: Record<string, unknown>;
  }) => Promise<void>;
  broadcastRestrictionStateToUser: (
    targetUsername: string,
    targetUserId: string,
    channelId: string,
    ws: ChatSocket
  ) => Promise<void>;
  broadcastToChannel: (
    targetUsername: string,
    ws: ChatSocket,
    payload: Record<string, unknown>
  ) => void;
};

export function sendModerationError(
  socket: ChatSocket,
  code: string,
  message: string,
  restriction?: ChatRestrictionState
) {
  socket.send(
    JSON.stringify({
      type: 'moderationError',
      code,
      message,
      restriction,
    })
  );
}

async function requireModerationContext(
  socket: ChatSocket,
  socketState: ChatSocket
): Promise<ModerationContext | null> {
  if (!socketState.chatUser || !socketState.targetUsername || !socketState.channelId) {
    sendModerationError(socket, 'FORBIDDEN', 'You do not have permission to moderate this chat.');
    return null;
  }

  const chatUser = socketState.chatUser;
  const channelId = socketState.channelId;

  const [channel, moderatorRecord] = await Promise.all([
    prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        ownerId: true,
        managers: { select: { id: true } },
        chatModerators: { select: { id: true } },
        chatModeratorBots: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: chatUser.moderatorUserId },
      select: { isAdmin: true },
    }),
  ]);

  if (!channel) {
    sendModerationError(socket, 'FORBIDDEN', 'You do not have permission to moderate this chat.');
    return null;
  }

  const isPlatformAdmin = Boolean(moderatorRecord?.isAdmin);

  let channelRole: ChatUser['channelRole'] = null;
  if (chatUser.isBot) {
    if (channel.chatModeratorBots.some((b) => b.id === chatUser.id)) {
      channelRole = 'botModerator';
    }
  } else if (channel.ownerId === chatUser.id) {
    channelRole = 'owner';
  } else if (channel.managers.some((m) => m.id === chatUser.id)) {
    channelRole = 'manager';
  } else if (channel.chatModerators.some((m) => m.id === chatUser.id)) {
    channelRole = 'chatModerator';
  }

  const isModerator =
    isPlatformAdmin ||
    channelRole === 'owner' ||
    channelRole === 'manager' ||
    channelRole === 'chatModerator' ||
    channelRole === 'botModerator';

  if (!isModerator) {
    sendModerationError(socket, 'FORBIDDEN', 'You do not have permission to moderate this chat.');
    return null;
  }

  const resolvedChatUser: ChatUser = { ...chatUser, isPlatformAdmin, channelRole };

  return {
    chatUser: resolvedChatUser,
    targetUsername: socketState.targetUsername,
    channelId,
  };
}

async function resolveModerationTarget(
  socket: ChatSocket,
  actingModeratorUserId: string,
  rawTargetUserId: unknown,
  channelId: string
) {
  const targetUserId = typeof rawTargetUserId === 'string' ? rawTargetUserId : '';

  if (!targetUserId || targetUserId === actingModeratorUserId) {
    sendModerationError(socket, 'INVALID_TARGET', 'Invalid moderation target.');
    return null;
  }

  const targetUserRecord = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      isAdmin: true,
      personalChannel: { select: { name: true } },
      ownedChannels: { where: { id: channelId }, select: { id: true } },
      managedChannels: { where: { id: channelId }, select: { id: true } },
      chatModeratedChannels: { where: { id: channelId }, select: { id: true } },
    },
  });

  if (!targetUserRecord) {
    sendModerationError(socket, 'INVALID_TARGET', 'Target user no longer exists.');
    return null;
  }

  let targetChannelRole: ChatUser['channelRole'] = null;
  if (targetUserRecord.ownedChannels.length > 0) {
    targetChannelRole = 'owner';
  } else if (targetUserRecord.managedChannels.length > 0) {
    targetChannelRole = 'manager';
  } else if (targetUserRecord.chatModeratedChannels.length > 0) {
    targetChannelRole = 'chatModerator';
  }

  return {
    targetUserId,
    targetUserRecord,
    targetChannelRole,
    resolvedTargetUsername: targetUserRecord.personalChannel?.name ?? 'that user',
  };
}

async function ensureAdminTargetModerationAllowed(
  socket: ChatSocket,
  actingModeratorUserId: string,
  targetIsAdmin: boolean
) {
  if (!targetIsAdmin) {
    return true;
  }

  const actingUserRecord = await prisma.user.findUnique({
    where: { id: actingModeratorUserId },
    select: { isAdmin: true },
  });

  if (!actingUserRecord?.isAdmin) {
    sendModerationError(
      socket,
      'FORBIDDEN',
      'Platform admins cannot be moderated via chat commands.'
    );
    return false;
  }

  return true;
}

function ensureRoleHierarchyAllowed(
  socket: ChatSocket,
  actorRole: ChatUser['channelRole'],
  actorIsPlatformAdmin: boolean,
  targetRole: ChatUser['channelRole']
): boolean {
  if (actorIsPlatformAdmin) return true;

  if (roleRank(actorRole) <= roleRank(targetRole)) {
    sendModerationError(
      socket,
      'FORBIDDEN',
      'You cannot moderate a user with an equal or higher role than yours.'
    );
    return false;
  }

  return true;
}

export async function handleDeleteMessageCommand(
  socket: ChatSocket,
  socketState: ChatSocket,
  msg: ChatModerationCommand,
  deps: DeleteMessageDeps
) {
  const context = await requireModerationContext(socket, socketState);
  if (!context) {
    return;
  }

  const msgId = typeof msg.msgId === 'string' ? msg.msgId : '';
  if (!msgId) {
    sendModerationError(socket, 'INVALID_REQUEST', 'Invalid message id.');
    return;
  }

  const deleted = await deps.deleteMessageFromHistory(context.targetUsername, msgId);
  if (!deleted) {
    sendModerationError(socket, 'NOT_FOUND', 'Message not found.');
    return;
  }

  await deps.logModerationEvent({
    action: ChatModerationAction.MESSAGE_DELETED,
    channelId: context.channelId,
    moderatorId: context.chatUser.moderatorUserId,
    reason: 'Message deleted by moderator',
    details: { msgId },
  });
  recordChatModerationAction('message_deleted');

  deps.broadcastToChannel(context.targetUsername, socket, { type: 'messageDeleted', msgId });
}

export async function handleUserRestrictionCommand(
  socket: ChatSocket,
  socketState: ChatSocket,
  msg: ChatModerationCommand,
  deps: UserRestrictionDeps
) {
  const context = await requireModerationContext(socket, socketState);
  if (!context) {
    return;
  }

  const actingModeratorUserId = context.chatUser.moderatorUserId;
  const target = await resolveModerationTarget(
    socket,
    actingModeratorUserId,
    msg.targetUserId,
    context.channelId
  );
  if (!target) {
    return;
  }

  const canModerateTarget = await ensureAdminTargetModerationAllowed(
    socket,
    actingModeratorUserId,
    target.targetUserRecord.isAdmin
  );
  if (!canModerateTarget) {
    return;
  }

  const hierarchyAllowed = ensureRoleHierarchyAllowed(
    socket,
    context.chatUser.channelRole,
    context.chatUser.isPlatformAdmin,
    target.targetChannelRole
  );
  if (!hierarchyAllowed) {
    return;
  }

  if (msg.type === 'mod:unbanUser' || msg.type === 'mod:liftTimeout') {
    await prisma.chatUserBan.deleteMany({
      where: {
        channelId: context.channelId,
        userId: target.targetUserId,
      },
    });

    await deps.logModerationEvent({
      action: ChatModerationAction.USER_UNBANNED,
      channelId: context.channelId,
      moderatorId: actingModeratorUserId,
      targetUserId: target.targetUserId,
      reason: 'User unbanned in chat',
    });
    recordChatModerationAction('user_unbanned');

    await deps.broadcastRestrictionStateToUser(
      context.targetUsername,
      target.targetUserId,
      context.channelId,
      socket
    );

    deps.broadcastToChannel(context.targetUsername, socket, {
      type: 'systemMsg',
      message: `${target.resolvedTargetUsername} can chat again.`,
    });
    return;
  }

  const reason =
    typeof msg.reason === 'string' && msg.reason.trim().length > 0
      ? msg.reason.trim().slice(0, 250)
      : msg.type === 'mod:timeoutUser'
        ? 'Timed out by moderator'
        : 'Banned by moderator';
  const durationSeconds =
    msg.type === 'mod:timeoutUser'
      ? Math.min(Math.max(Number(msg.durationSeconds) || 300, 10), 60 * 60 * 24)
      : null;
  const expiresAt = durationSeconds ? new Date(Date.now() + durationSeconds * 1000) : null;

  await prisma.chatUserBan.upsert({
    where: {
      channelId_userId: {
        channelId: context.channelId,
        userId: target.targetUserId,
      },
    },
    create: {
      channelId: context.channelId,
      userId: target.targetUserId,
      bannedById: actingModeratorUserId,
      reason,
      expiresAt,
    },
    update: {
      bannedById: actingModeratorUserId,
      reason,
      expiresAt,
    },
  });

  await deps.logModerationEvent({
    action:
      msg.type === 'mod:timeoutUser'
        ? ChatModerationAction.USER_TIMEOUT
        : ChatModerationAction.USER_BANNED,
    channelId: context.channelId,
    moderatorId: actingModeratorUserId,
    targetUserId: target.targetUserId,
    reason,
    details: durationSeconds ? { durationSeconds } : undefined,
  });
  recordChatModerationAction(msg.type === 'mod:timeoutUser' ? 'user_timeout' : 'user_banned');

  await deps.broadcastRestrictionStateToUser(
    context.targetUsername,
    target.targetUserId,
    context.channelId,
    socket
  );

  deps.broadcastToChannel(context.targetUsername, socket, {
    type: 'systemMsg',
    message:
      msg.type === 'mod:timeoutUser'
        ? `${target.resolvedTargetUsername} was timed out for ${durationSeconds}s.`
        : `${target.resolvedTargetUsername} was banned.`,
  });
}
