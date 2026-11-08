import type { Component } from 'vue';
import { AlertCircle, CheckCircle2, XCircle } from '@lucide/vue';

export const ADMIN_TABS = ['users', 'channels', 'audit', 'reports', 'settings'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const AUDIT_SOURCE_DOT: Record<string, string> = {
  platform: 'bg-primary',
  chat: 'bg-amber-500',
};

export const AUDIT_ACTION_COLOR: Record<string, string> = {
  BAN_USER: 'text-destructive',
  UNBAN_USER: 'text-green-600 dark:text-green-400',
  PROMOTE_ADMIN: 'text-primary',
  DEMOTE_ADMIN: 'text-amber-500',
  RESTRICT_CHANNEL: 'text-destructive',
  UNRESTRICT_CHANNEL: 'text-green-600 dark:text-green-400',
  REPORT_REVIEWED: 'text-primary',
  REPORT_DISMISSED: 'text-muted-foreground',
  REPORT_ENFORCEMENT: 'text-amber-500',
  DELETE_MESSAGE: 'text-amber-500',
  TIMEOUT_USER: 'text-amber-500',
  BAN_FROM_CHAT: 'text-destructive',
  LIFT_CHAT_BAN: 'text-green-600 dark:text-green-400',
  BYPASS_VERIFICATION_ENABLED: 'text-green-600 dark:text-green-400',
  BYPASS_VERIFICATION_DISABLED: 'text-amber-500',
};

export const REPORT_STATUS_CONFIG: Record<
  'OPEN' | 'REVIEWED' | 'DISMISSED',
  { label: string; icon: Component; class: string; dot: string }
> = {
  OPEN: {
    label: 'Open',
    icon: AlertCircle,
    class: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  REVIEWED: {
    label: 'Reviewed',
    icon: CheckCircle2,
    class: 'bg-primary/10 text-primary border-primary/20',
    dot: 'bg-primary',
  },
  DISMISSED: {
    label: 'Dismissed',
    icon: XCircle,
    class: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

export const LAST_ACTION_LABELS: Record<string, string> = {
  REVIEW: 'Reviewed',
  DISMISS: 'Dismissed',
  DELETE_REPORTED_MESSAGE: 'Message deleted',
  TIMEOUT_10M: 'Timeout 10m',
  TIMEOUT_1H: 'Timeout 1h',
  BAN_CHAT: 'Chat banned',
  LIFT_CHAT_BAN: 'Chat ban lifted',
  BAN_PLATFORM: 'Platform banned',
  UNBAN_PLATFORM: 'Platform unbanned',
};

export interface UserWithBan {
  id: string;
  slack_id: string;
  email: string | null;
  pfpUrl: string;
  isAdmin: boolean;
  bypassVerification: boolean;
  ban: {
    id: string;
    reason: string;
    bannedBy: string;
    createdAt: string;
    expiresAt: string | null;
  } | null;
  personalChannel: { name: string } | null;
}

export interface ChannelWithRestriction {
  id: string;
  name: string;
  description: string;
  pfpUrl: string;
  owner: { id: string; slack_id: string; pfpUrl: string; personalChannel: { name: string } };
  personalFor: { id: string } | null;
  restriction: {
    id: string;
    reason: string;
    restrictedBy: string;
    createdAt: string;
    expiresAt: string | null;
  } | null;
}

export interface AuditLog {
  id: string;
  source: 'platform' | 'chat';
  action: string;
  createdAt: string;
  actor: string;
  actorMeta?: {
    isPlatformAdmin: boolean;
    isChannelModerator: boolean;
  };
  target: string | null;
  targetMeta?: {
    isPlatformAdmin: boolean;
    isChannelModerator: boolean;
  } | null;
  reason: string | null;
  details?: unknown;
  channelName?: string;
  deletedMessageContent?: string | null;
}

export interface ChatReport {
  id: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  reason: string;
  reportedMessage: string | null;
  reportedMessageId: string | null;
  targetUsername: string | null;
  channelName: string;
  createdAt: string;
  handledAt: string | null;
  handlingNote: string | null;
  lastAction:
    | 'REVIEW'
    | 'DISMISS'
    | 'DELETE_REPORTED_MESSAGE'
    | 'TIMEOUT_10M'
    | 'TIMEOUT_1H'
    | 'BAN_CHAT'
    | 'LIFT_CHAT_BAN'
    | 'BAN_PLATFORM'
    | 'UNBAN_PLATFORM'
    | null;
  reporter: string;
  target: string;
  handledBy: string | null;
}
