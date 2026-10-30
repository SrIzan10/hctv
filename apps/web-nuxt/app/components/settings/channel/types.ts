import type { Component } from 'vue';
import type {
  BotAccount,
  Channel,
  ChatModerationSettings,
  Follow,
  StreamInfo,
  StreamKey,
  User,
} from '@hctv/db';
import { Bot, MessageSquareWarning, Shield, Wrench } from '@lucide/vue';

// payload of /api/pages/settings-channel (JSON, so dates arrive as strings at runtime)
export type ChannelSettingsChannel = Channel & {
  owner: User;
  ownerPersonalChannel: Channel | null;
  managers: User[];
  managerPersonalChannels: (Channel | null)[];
  chatModerators: User[];
  chatModeratorPersonalChannels: (Channel | null)[];
  chatModeratorBots: BotAccount[];
  allBotAccounts: Pick<BotAccount, 'id' | 'displayName' | 'slug' | 'pfpUrl'>[];
  streamInfo: StreamInfo[];
  streamKey: StreamKey | null;
  chatSettings: ChatModerationSettings | null;
  followers: (Follow & { user: { id: string; slack_id: string } })[];
  followerPersonalChannels: (Channel | null)[];
  is247: boolean;
  nameLastChanged: Date | null;
};

export type ChannelSettingsResponse = {
  channel: ChannelSettingsChannel;
  isOwner: boolean;
  isPersonal: boolean;
};

export type ChannelRoleBadgeKey =
  | 'owner'
  | 'manager'
  | 'chatModerator'
  | 'botModerator'
  | 'platformAdmin';

export const ROLE_BADGE_META: Record<
  ChannelRoleBadgeKey,
  { icon: Component; label: string; className: string }
> = {
  owner: {
    icon: Shield,
    label: 'Owner',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  manager: {
    icon: Wrench,
    label: 'Manager',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  chatModerator: {
    icon: MessageSquareWarning,
    label: 'Chat Mod',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  botModerator: {
    icon: Bot,
    label: 'Bot Mod',
    className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  platformAdmin: {
    icon: Shield,
    label: 'Platform Admin',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
};

export const withPlatformAdmin = (
  roles: readonly ChannelRoleBadgeKey[],
  isPlatformAdmin?: boolean
): ChannelRoleBadgeKey[] => (isPlatformAdmin ? [...roles, 'platformAdmin'] : [...roles]);
