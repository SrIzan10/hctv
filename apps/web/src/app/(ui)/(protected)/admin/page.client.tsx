'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Link as LinkIcon,
} from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { parseAsString, useQueryState } from 'nuqs';
import { useRouter } from 'next/navigation';

const ADMIN_TABS = ['users', 'channels', 'audit', 'reports'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

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

  const fetchUsers = useCallback(async (search: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      toast.error('Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchChannels = useCallback(async (search: string) => {
    setChannelsLoading(true);
    try {
      const res = await fetch(`/api/admin/channels?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        setChannels(await res.json());
      }
    } catch (e) {
      toast.error('Failed to fetch channels');
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit?take=200');
      if (res.ok) {
        setAuditLogs(await res.json());
      }
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
      if (reportId) {
        query.set('reportId', reportId);
      }
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
    if (!highlightReportId || activeTab !== 'reports') {
      return;
    }

    const timer = setTimeout(() => {
      const target = document.getElementById(`report-row-${highlightReportId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [highlightReportId, activeTab, reports]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChannels(channelSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [channelSearch, fetchChannels]);

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
        toast.success('User banned successfully');
        fetchUsers(userSearch);
        fetchAuditLogs();
        setBanDialogOpen(false);
        resetDialogState();
      } else {
        const err = await res.text();
        toast.error(err || 'Failed to ban user');
      }
    } catch (e) {
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'unban',
        }),
      });

      if (res.ok) {
        toast.success('User unbanned successfully');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        toast.error('Failed to unban user');
      }
    } catch (e) {
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
        toast.success('Channel restricted successfully');
        fetchChannels(channelSearch);
        fetchAuditLogs();
        setRestrictDialogOpen(false);
        resetDialogState();
      } else {
        const err = await res.text();
        toast.error(err || 'Failed to restrict channel');
      }
    } catch (e) {
      toast.error('Failed to restrict channel');
    }
  };

  const handleUnrestrictChannel = async (channelId: string) => {
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          action: 'unrestrict',
        }),
      });

      if (res.ok) {
        toast.success('Channel unrestricted successfully');
        fetchChannels(channelSearch);
        fetchAuditLogs();
      } else {
        toast.error('Failed to unrestrict channel');
      }
    } catch (e) {
      toast.error('Failed to unrestrict channel');
    }
  };

  const handlePromoteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'promote',
        }),
      });

      if (res.ok) {
        toast.success('User promoted to admin');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        const err = await res.text();
        toast.error(err || 'Failed to promote user');
      }
    } catch (e) {
      toast.error('Failed to promote user');
    }
  };

  const handleDemoteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'demote',
        }),
      });

      if (res.ok) {
        toast.success('User demoted from admin');
        fetchUsers(userSearch);
        fetchAuditLogs();
      } else {
        const err = await res.text();
        toast.error(err || 'Failed to demote user');
      }
    } catch (e) {
      toast.error('Failed to demote user');
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and channels on the platform</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={async (nextTab) => {
          const tab = nextTab as AdminTab;
          setActiveTab(tab);
          await setTabParam(tab);
          if (tab !== 'reports') {
            await setReportIdParam(null);
            setHighlightReportId(null);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Search and manage user accounts. Ban users to prevent them from using the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.pfpUrl} />
                              <AvatarFallback>
                                {user.personalChannel?.name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.personalChannel?.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.isAdmin && <Badge variant="default">Admin</Badge>}
                            {user.ban ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Ban className="h-3 w-3" />
                                Banned
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </div>
                          {user.ban && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <p>Reason: {user.ban.reason}</p>
                              {user.ban.expiresAt && (
                                <p>Expires: {format(new Date(user.ban.expiresAt), 'PPP')}</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.isAdmin ? (
                              user.id !== currentUser.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDemoteUser(user.id)}
                                >
                                  <ShieldMinus className="h-4 w-4 mr-1" />
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
                                  >
                                    <ShieldOff className="h-4 w-4 mr-1" />
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
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Ban
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePromoteUser(user.id)}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                  Promote
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Channel Management</CardTitle>
              <CardDescription>
                Search and manage channels. Restrict channels to prevent streams from being viewed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by channel name..."
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : channels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No channels found
                      </TableCell>
                    </TableRow>
                  ) : (
                    channels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={channel.pfpUrl} />
                              <AvatarFallback>{channel.name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              {channel.personalFor && (
                                <Badge variant="outline" className="text-xs">
                                  Personal
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={channel.owner.pfpUrl} />
                              <AvatarFallback>O</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{channel.owner.personalChannel.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {channel.restriction ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <Ban className="h-3 w-3" />
                              Restricted
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                          {channel.restriction && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <p>Reason: {channel.restriction.reason}</p>
                              {channel.restriction.expiresAt && (
                                <p>
                                  Expires: {format(new Date(channel.restriction.expiresAt), 'PPP')}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {channel.restriction ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnrestrictChannel(channel.id)}
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
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
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Restrict
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>
                    Organization-wide moderation and admin actions across all admins.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No audit logs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={`${log.source}-${log.id}`}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'PPP p')}
                        </TableCell>
                        <TableCell>{log.actor}</TableCell>
                        <TableCell>
                          <Badge variant={log.source === 'chat' ? 'secondary' : 'outline'}>
                            {log.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{log.action}</code>
                        </TableCell>
                        <TableCell>{log.target ?? '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{log.reason ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Chat Reports</CardTitle>
                  <CardDescription>
                    User-submitted chat reports. Use report deep links to jump directly to a report.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReports(reportIdParam ?? undefined)}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Last Action</TableHead>
                    <TableHead>Handled By</TableHead>
                    <TableHead>Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        No reports yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => {
                      return (
                        <TableRow
                          key={report.id}
                          id={`report-row-${report.id}`}
                          className={cn(
                            highlightReportId === report.id
                              ? 'bg-primary/10 border-l-2 border-primary'
                              : undefined
                          )}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(report.createdAt), 'PPP p')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.status === 'OPEN' ? 'destructive' : 'secondary'}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.channelName}</TableCell>
                          <TableCell>{report.reporter}</TableCell>
                          <TableCell>{report.target}</TableCell>
                          <TableCell className="max-w-[280px] truncate" title={report.reason}>
                            {report.reason}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{report.lastAction ?? '-'}</code>
                          </TableCell>
                          <TableCell>{report.handledBy ?? '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/reports/${report.id}`)}
                            >
                              <LinkIcon className="h-4 w-4 mr-1" />
                              Open Case
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              Ban {selectedUser?.personalChannel?.name || selectedUser?.slack_id} from the platform.
              They will not be able to stream or use the platform while banned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Enter the reason for banning this user..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires (optional)</label>
              <p className="text-xs text-muted-foreground mb-2">Leave empty for a permanent ban</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !expiresAt && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, 'PPP p') : 'Pick a date & time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={(date) => {
                        if (date) {
                          const newDate = expiresAt ? new Date(expiresAt) : new Date();
                          date.setHours(newDate.getHours(), newDate.getMinutes());
                          setExpiresAt(date);
                        } else {
                          setExpiresAt(undefined);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                    <div className="border-t p-3">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        className="mt-1"
                        value={expiresAt ? format(expiresAt, 'HH:mm') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = expiresAt ? new Date(expiresAt) : new Date();
                            newDate.setHours(hours, minutes);
                            setExpiresAt(newDate);
                          }
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                {expiresAt && (
                  <Button variant="ghost" size="icon" onClick={() => setExpiresAt(undefined)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
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
              Restrict {selectedChannel?.name} from streaming. Viewers will not be able to watch
              streams from this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Enter the reason for restricting this channel..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires (optional)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave empty for a permanent restriction
              </p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !expiresAt && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, 'PPP p') : 'Pick a date & time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={(date) => {
                        if (date) {
                          const newDate = expiresAt ? new Date(expiresAt) : new Date();
                          date.setHours(newDate.getHours(), newDate.getMinutes());
                          setExpiresAt(date);
                        } else {
                          setExpiresAt(undefined);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                    <div className="border-t p-3">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        className="mt-1"
                        value={expiresAt ? format(expiresAt, 'HH:mm') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = expiresAt ? new Date(expiresAt) : new Date();
                            newDate.setHours(hours, minutes);
                            setExpiresAt(newDate);
                          }
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                {expiresAt && (
                  <Button variant="ghost" size="icon" onClick={() => setExpiresAt(undefined)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
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
  target: string | null;
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
