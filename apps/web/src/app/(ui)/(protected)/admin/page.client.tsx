'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Tv,
  Ban,
  ShieldOff,
  Search,
  CalendarIcon,
  ShieldCheck,
  ShieldMinus,
  X,
  ClipboardList,
  Flag,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  Circle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { User } from '@hctv/db';
import { cn } from '@/lib/utils';
import { parseAsString, useQueryState } from 'nuqs';
import { useRouter } from 'next/navigation';

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_TABS = ['users', 'channels', 'audit', 'reports'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { id: 'channels', label: 'Channels', icon: <Tv className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'reports', label: 'Reports', icon: <Flag className="h-4 w-4" /> },
];

// Audit action colour coding
const AUDIT_SOURCE_DOT: Record<string, string> = {
  platform: 'bg-primary',
  chat: 'bg-amber-500',
};

const AUDIT_ACTION_COLOR: Record<string, string> = {
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
};

const REPORT_STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    icon: <AlertCircle className="h-3 w-3" />,
    class: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  REVIEWED: {
    label: 'Reviewed',
    icon: <CheckCircle2 className="h-3 w-3" />,
    class: 'bg-primary/10 text-primary border-primary/20',
    dot: 'bg-primary',
  },
  DISMISSED: {
    label: 'Dismissed',
    icon: <XCircle className="h-3 w-3" />,
    class: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

const LAST_ACTION_LABELS: Record<string, string> = {
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

// ─── Small helpers ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <h2 className="text-base font-semibold leading-tight pb-0 mb-0">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <Circle className="h-8 w-8 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-lg bg-muted/40 animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─── Date/time picker shared component ──────────────────────────────────────

function DateTimePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-start text-left font-normal text-sm',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP p') : 'Pick a date & time'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                const newDate = value ? new Date(value) : new Date();
                date.setHours(newDate.getHours(), newDate.getMinutes());
                onChange(date);
              } else {
                onChange(undefined);
              }
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          <div className="border-t p-3">
            <label className="text-sm font-medium">Time</label>
            <Input
              type="time"
              className="mt-1"
              value={value ? format(value, 'HH:mm') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  const newDate = value ? new Date(value) : new Date();
                  newDate.setHours(hours, minutes);
                  onChange(newDate);
                }
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" onClick={() => onChange(undefined)}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminPanelClient({ currentUser }: AdminPanelClientProps) {
  const router = useRouter();
  const [tabParam, setTabParam] = useQueryState('tab', parseAsString.withDefault('users'));
  const [reportIdParam, setReportIdParam] = useQueryState('reportId');
  const [userSearch, setUserSearch] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserWithBan[]>([]);
  const [channels, setChannels] = useState<ChannelWithRestriction[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [highlightReportId, setHighlightReportId] = useState<string | null>(null);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [restrictDialogOpen, setRestrictDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithBan | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithRestriction | null>(null);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (search: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      if (res.ok) setUsers(await res.json());
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchChannels = useCallback(async (search: string) => {
    setChannelsLoading(true);
    try {
      const res = await fetch(`/api/admin/channels?search=${encodeURIComponent(search)}`);
      if (res.ok) setChannels(await res.json());
    } catch {
      toast.error('Failed to fetch channels');
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit?take=200');
      if (res.ok) setAuditLogs(await res.json());
    } catch {
      toast.error('Failed to fetch audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async (reportId?: string) => {
    setReportsLoading(true);
    try {
      const query = new URLSearchParams({ take: '200' });
      if (reportId) query.set('reportId', reportId);
      const res = await fetch(`/api/admin/reports?${query.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { reports: ChatReport[]; reportId?: string | null };
        setReports(data.reports);
      }
    } catch {
      toast.error('Failed to fetch reports');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tabParam && ADMIN_TABS.includes(tabParam as AdminTab)) {
      setActiveTab(tabParam as AdminTab);
    }
    if (reportIdParam) {
      setActiveTab('reports');
      setHighlightReportId(reportIdParam);
    } else {
      setHighlightReportId(null);
    }
  }, [reportIdParam, tabParam]);

  useEffect(() => {
    fetchUsers('');
    fetchChannels('');
    fetchAuditLogs();
    fetchReports(reportIdParam ?? undefined);
  }, [fetchUsers, fetchChannels, fetchAuditLogs, fetchReports, reportIdParam]);

  useEffect(() => {
    if (!highlightReportId || activeTab !== 'reports') return;
    const timer = setTimeout(() => {
      const target = document.getElementById(`report-card-${highlightReportId}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightReportId, activeTab, reports]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchChannels(channelSearch), 300);
    return () => clearTimeout(timer);
  }, [channelSearch, fetchChannels]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const resetDialogState = () => {
    setReason('');
    setExpiresAt(undefined);
    setSelectedUser(null);
    setSelectedChannel(null);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: 'ban',
          reason,
          expiresAt: expiresAt?.toISOString(),
        }),
      });
      if (res.ok) {
        toast.success('User banned');
        fetchUsers(userSearch);
        fetchAuditLogs();
        setBanDialogOpen(false);
        resetDialogState();
      } else {
        toast.error((await res.text()) || 'Failed to ban user');
      }
    } catch {
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'unban' }),
      });
      if (res.ok) {
        toast.success('User unbanned');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        toast.error('Failed to unban user');
      }
    } catch {
      toast.error('Failed to unban user');
    }
  };

  const handleRestrictChannel = async () => {
    if (!selectedChannel || !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          action: 'restrict',
          reason,
          expiresAt: expiresAt?.toISOString(),
        }),
      });
      if (res.ok) {
        toast.success('Channel restricted');
        fetchChannels(channelSearch);
        fetchAuditLogs();
        setRestrictDialogOpen(false);
        resetDialogState();
      } else {
        toast.error((await res.text()) || 'Failed to restrict channel');
      }
    } catch {
      toast.error('Failed to restrict channel');
    }
  };

  const handleUnrestrictChannel = async (channelId: string) => {
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, action: 'unrestrict' }),
      });
      if (res.ok) {
        toast.success('Channel unrestricted');
        fetchChannels(channelSearch);
        fetchAuditLogs();
      } else {
        toast.error('Failed to unrestrict channel');
      }
    } catch {
      toast.error('Failed to unrestrict channel');
    }
  };

  const handlePromoteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'promote' }),
      });
      if (res.ok) {
        toast.success('User promoted to admin');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        toast.error((await res.text()) || 'Failed to promote user');
      }
    } catch {
      toast.error('Failed to promote user');
    }
  };

  const handleDemoteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'demote' }),
      });
      if (res.ok) {
        toast.success('User demoted');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        toast.error((await res.text()) || 'Failed to demote user');
      }
    } catch {
      toast.error('Failed to demote user');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const openReports = reports.filter((r) => r.status === 'OPEN').length;

  // ── Tab switch helper ─────────────────────────────────────────────────────

  const switchTab = async (tab: AdminTab) => {
    setActiveTab(tab);
    await setTabParam(tab);
    if (tab !== 'reports') {
      await setReportIdParam(null);
      setHighlightReportId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight pb-0 mb-0">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">
                  Signed in as{' '}
                  <span className="font-medium text-foreground">{currentUser.email}</span>
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5">
              <StatPill icon={<Users className="h-3 w-3" />} label={`${users.length} users`} />
              <span className="text-border mx-1">|</span>
              <StatPill
                icon={<Activity className="h-3 w-3" />}
                label={`${auditLogs.length} events`}
              />
              {openReports > 0 && (
                <>
                  <span className="text-border mx-1">|</span>
                  <StatPill
                    icon={<Flag className="h-3 w-3" />}
                    label={`${openReports} open`}
                    className="text-destructive"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + content ──────────────────────────────────────── */}
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {item.id === 'reports' && openReports > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                      {openReports}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            {/* ── Users ─────────────────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div>
                <SectionHeader
                  icon={<Users className="h-4 w-4" />}
                  title="User Management"
                  description="Search and manage user accounts."
                />

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {usersLoading ? (
                  <LoadingRows cols={3} />
                ) : users.length === 0 ? (
                  <EmptyState message="No users found" />
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={user.pfpUrl} />
                          <AvatarFallback className="text-xs">
                            {user.personalChannel?.name?.[0]?.toUpperCase() ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {user.personalChannel?.name ?? user.slack_id}
                            </span>
                            {user.isAdmin && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <Shield className="h-2.5 w-2.5" />
                                Admin
                              </span>
                            )}
                            {user.ban && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                <Ban className="h-2.5 w-2.5" />
                                Banned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email ?? user.slack_id}
                          </p>
                          {user.ban && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ban reason: {user.ban.reason}
                              {user.ban.expiresAt &&
                                ` · Expires ${format(new Date(user.ban.expiresAt), 'PP')}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {user.isAdmin ? (
                            user.id !== currentUser.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDemoteUser(user.id)}
                                className="h-7 text-xs gap-1"
                              >
                                <ShieldMinus className="h-3 w-3" />
                                Demote
                              </Button>
                            )
                          ) : (
                            <>
                              {user.ban ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnbanUser(user.id)}
                                  className="h-7 text-xs gap-1"
                                >
                                  <ShieldOff className="h-3 w-3" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setBanDialogOpen(true);
                                  }}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Ban className="h-3 w-3" />
                                  Ban
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteUser(user.id)}
                                className="h-7 text-xs gap-1"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Promote
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Channels ───────────────────────────────────────────────── */}
            {activeTab === 'channels' && (
              <div>
                <SectionHeader
                  icon={<Tv className="h-4 w-4" />}
                  title="Channel Management"
                  description="Search and restrict channels from streaming."
                />

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by channel name…"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {channelsLoading ? (
                  <LoadingRows cols={4} />
                ) : channels.length === 0 ? (
                  <EmptyState message="No channels found" />
                ) : (
                  <div className="space-y-2">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={channel.pfpUrl} />
                          <AvatarFallback className="text-xs">
                            {channel.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{channel.name}</span>
                            {channel.personalFor && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                Personal
                              </span>
                            )}
                            {channel.restriction && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                <Ban className="h-2.5 w-2.5" />
                                Restricted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={channel.owner.pfpUrl} />
                              <AvatarFallback className="text-[8px]">O</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {channel.owner.personalChannel.name}
                            </span>
                          </div>
                          {channel.restriction && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Reason: {channel.restriction.reason}
                              {channel.restriction.expiresAt &&
                                ` · Expires ${format(new Date(channel.restriction.expiresAt), 'PP')}`}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {channel.restriction ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnrestrictChannel(channel.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <ShieldOff className="h-3 w-3" />
                              Unrestrict
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedChannel(channel);
                                setRestrictDialogOpen(true);
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <Ban className="h-3 w-3" />
                              Restrict
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Audit Log ─────────────────────────────────────────────── */}
            {activeTab === 'audit' && (
              <div>
                <SectionHeader
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="Audit Log"
                  description="Platform-wide moderation and admin actions across all admins."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAuditLogs}
                      className="h-7 text-xs gap-1.5 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </Button>
                  }
                />

                {/* Legend */}
                <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                    Platform
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                    Chat
                  </span>
                </div>

                {auditLoading ? (
                  <LoadingRows cols={6} />
                ) : auditLogs.length === 0 ? (
                  <EmptyState message="No audit events yet" />
                ) : (
                  <div className="relative">
                    {/* Timeline spine */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                      {auditLogs.map((log, idx) => {
                        const dotColor = AUDIT_SOURCE_DOT[log.source] ?? 'bg-muted-foreground';
                        const actionColor = AUDIT_ACTION_COLOR[log.action] ?? 'text-foreground';
                        const isLast = idx === auditLogs.length - 1;

                        return (
                          <div key={`${log.source}-${log.id}`} className="flex gap-4 group">
                            {/* Dot on spine */}
                            <div className="flex flex-col items-center pt-3 shrink-0">
                              <div
                                className={cn(
                                  'h-3.5 w-3.5 rounded-full border-2 border-background z-10 shrink-0',
                                  dotColor
                                )}
                              />
                            </div>

                            {/* Event card */}
                            <div
                              className={cn(
                                'flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2.5 mb-1 transition-colors group-hover:bg-muted/30 group-hover:border-border',
                                isLast && 'mb-0'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  {/* Action chip */}
                                  <span
                                    className={cn('text-xs font-mono font-semibold', actionColor)}
                                  >
                                    {log.action}
                                  </span>

                                  {/* Actor → Target */}
                                  <span className="text-xs text-muted-foreground">
                                    by{' '}
                                    <span className="font-medium text-foreground">{log.actor}</span>
                                  </span>
                                  {log.actorMeta?.isChannelModerator && (
                                    <TooltipProvider>
                                      <Tooltip delayDuration={200}>
                                        <TooltipTrigger asChild>
                                          <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Channel Mod</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {log.actorMeta?.isPlatformAdmin && (
                                    <TooltipProvider>
                                      <Tooltip delayDuration={200}>
                                        <TooltipTrigger asChild>
                                          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Platform Admin</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  {log.target && (
                                    <>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="text-xs font-medium">{log.target}</span>
                                      {log.targetMeta?.isChannelModerator && (
                                        <TooltipProvider>
                                          <Tooltip delayDuration={200}>
                                            <TooltipTrigger asChild>
                                              <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Channel Mod</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      {log.targetMeta?.isPlatformAdmin && (
                                        <TooltipProvider>
                                          <Tooltip delayDuration={200}>
                                            <TooltipTrigger asChild>
                                              <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                              Platform Admin
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </>
                                  )}

                                  {log.channelName && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {log.channelName}
                                    </span>
                                  )}
                                </div>

                                {/* Time */}
                                <time
                                  className="text-[11px] text-muted-foreground shrink-0 tabular-nums"
                                  title={format(new Date(log.createdAt), 'PPP p')}
                                >
                                  {formatDistanceToNow(new Date(log.createdAt), {
                                    addSuffix: true,
                                  })}
                                </time>
                              </div>

                              {log.reason && (
                                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                  {log.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Reports ───────────────────────────────────────────────── */}
            {activeTab === 'reports' && (
              <div>
                <SectionHeader
                  icon={<Flag className="h-4 w-4" />}
                  title="Chat Reports"
                  description="User-submitted chat reports requiring review."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchReports(reportIdParam ?? undefined)}
                      className="h-7 text-xs gap-1.5 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </Button>
                  }
                />

                {/* Status filter summary */}
                {reports.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(['OPEN', 'REVIEWED', 'DISMISSED'] as const).map((status) => {
                      const count = reports.filter((r) => r.status === status).length;
                      if (!count) return null;
                      const cfg = REPORT_STATUS_CONFIG[status];
                      return (
                        <span
                          key={status}
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
                            cfg.class
                          )}
                        >
                          {cfg.icon}
                          {count} {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {reportsLoading ? (
                  <LoadingRows cols={9} />
                ) : reports.length === 0 ? (
                  <EmptyState message="No reports yet" />
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => {
                      const isHighlighted = highlightReportId === report.id;
                      const statusCfg = REPORT_STATUS_CONFIG[report.status];

                      return (
                        <div
                          key={report.id}
                          id={`report-card-${report.id}`}
                          className={cn(
                            'rounded-xl border bg-card overflow-hidden transition-all',
                            isHighlighted
                              ? 'border-primary ring-2 ring-primary/20 shadow-sm shadow-primary/10'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                        >
                          {/* Card top bar */}
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/20">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Status dot + label */}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                                  statusCfg.class
                                )}
                              >
                                {statusCfg.icon}
                                {statusCfg.label}
                              </span>

                              {/* Channel */}
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                {report.channelName}
                              </span>

                              {/* Reporter → Target */}
                              <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                                <span className="font-medium text-foreground">
                                  {report.reporter}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium text-foreground">{report.target}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <time className="text-[11px] text-muted-foreground tabular-nums hidden md:block">
                                {formatDistanceToNow(new Date(report.createdAt), {
                                  addSuffix: true,
                                })}
                              </time>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/reports/${report.id}`)}
                                className="h-6 text-xs gap-1 px-2"
                              >
                                Open case
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Card body */}
                          <div className="px-4 py-3 space-y-2">
                            {/* Reason */}
                            <p className="text-sm">{report.reason}</p>

                            {/* Reported message */}
                            {report.reportedMessage && (
                              <div className="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                  {report.reportedMessage}
                                </p>
                              </div>
                            )}

                            {/* Footer meta */}
                            {(report.lastAction || report.handledBy) && (
                              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground flex-wrap">
                                {report.lastAction && (
                                  <span className="flex items-center gap-1">
                                    Last action:
                                    <span className="font-medium text-foreground">
                                      {LAST_ACTION_LABELS[report.lastAction] ?? report.lastAction}
                                    </span>
                                  </span>
                                )}
                                {report.handledBy && (
                                  <span className="flex items-center gap-1">
                                    Handled by:
                                    <span className="font-medium text-foreground">
                                      {report.handledBy}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ban dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={banDialogOpen}
        onOpenChange={(open) => {
          setBanDialogOpen(open);
          if (!open) resetDialogState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban{' '}
              <span className="font-semibold">
                {selectedUser?.personalChannel?.name ?? selectedUser?.slack_id}
              </span>{' '}
              from the platform. They cannot stream or use the platform while banned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Enter the reason for banning this user…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires (optional)</label>
              <p className="text-xs text-muted-foreground mb-2">Leave empty for a permanent ban.</p>
              <DateTimePicker value={expiresAt} onChange={setExpiresAt} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBanDialogOpen(false);
                resetDialogState();
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restrict channel dialog ───────────────────────────────────────── */}
      <Dialog
        open={restrictDialogOpen}
        onOpenChange={(open) => {
          setRestrictDialogOpen(open);
          if (!open) resetDialogState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restrict Channel</DialogTitle>
            <DialogDescription>
              Restrict <span className="font-semibold">{selectedChannel?.name}</span> from
              streaming. Viewers will not be able to watch this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Enter the reason for restricting this channel…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires (optional)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave empty for a permanent restriction.
              </p>
              <DateTimePicker value={expiresAt} onChange={setExpiresAt} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRestrictDialogOpen(false);
                resetDialogState();
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestrictChannel}>
              Restrict Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tiny helper component ────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
      {icon}
      {label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserWithBan {
  id: string;
  slack_id: string;
  email: string | null;
  pfpUrl: string;
  isAdmin: boolean;
  ban: {
    id: string;
    reason: string;
    bannedBy: string;
    createdAt: string;
    expiresAt: string | null;
  } | null;
  personalChannel: { name: string } | null;
}

interface ChannelWithRestriction {
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

interface AuditLog {
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
}

interface ChatReport {
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

interface AdminPanelClientProps {
  currentUser: User;
}
