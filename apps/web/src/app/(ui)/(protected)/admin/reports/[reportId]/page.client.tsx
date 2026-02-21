'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Gavel,
  Flag,
  User,
  MessageSquare,
  Clock,
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  Ban,
  Unlock,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type ReportModerationAction =
  | 'review'
  | 'dismiss'
  | 'delete_reported_message'
  | 'timeout_10m'
  | 'timeout_1h'
  | 'ban_chat'
  | 'lift_chat_ban'
  | 'ban_platform'
  | 'unban_platform';

type ActionSeverity = 'info' | 'moderate' | 'severe';

interface ActionOption {
  value: ReportModerationAction;
  label: string;
  description: string;
  severity: ActionSeverity;
  requiresNote?: boolean;
  icon: React.ReactNode;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'review',
    label: 'Mark as reviewed',
    description: 'Acknowledge the report without further action.',
    severity: 'info',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: 'dismiss',
    label: 'Dismiss',
    description: 'Close this report as unfounded or resolved.',
    severity: 'info',
    icon: <XCircle className="h-4 w-4" />,
  },
  {
    value: 'delete_reported_message',
    label: 'Delete message',
    description: 'Remove the reported message from the chat.',
    severity: 'moderate',
    requiresNote: true,
    icon: <Trash2 className="h-4 w-4" />,
  },
  {
    value: 'timeout_10m',
    label: 'Timeout 10 minutes',
    description: 'Prevent user from chatting for 10 minutes.',
    severity: 'moderate',
    requiresNote: true,
    icon: <Timer className="h-4 w-4" />,
  },
  {
    value: 'timeout_1h',
    label: 'Timeout 1 hour',
    description: 'Prevent user from chatting for 1 hour.',
    severity: 'moderate',
    requiresNote: true,
    icon: <Timer className="h-4 w-4" />,
  },
  {
    value: 'ban_chat',
    label: 'Ban from chat',
    description: 'Permanently ban user from chat.',
    severity: 'severe',
    requiresNote: true,
    icon: <Ban className="h-4 w-4" />,
  },
  {
    value: 'lift_chat_ban',
    label: 'Lift chat ban',
    description: 'Restore chat access for this user.',
    severity: 'info',
    requiresNote: true,
    icon: <Unlock className="h-4 w-4" />,
  },
  {
    value: 'ban_platform',
    label: 'Ban from platform',
    description: 'Permanently ban user from the entire platform.',
    severity: 'severe',
    requiresNote: true,
    icon: <ShieldOff className="h-4 w-4" />,
  },
  {
    value: 'unban_platform',
    label: 'Unban from platform',
    description: 'Restore platform access for this user.',
    severity: 'info',
    requiresNote: true,
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];

const SEVERITY_STYLES: Record<
  ActionSeverity,
  { card: string; selected: string; icon: string; ring: string }
> = {
  info: {
    card: 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
    selected: 'border-primary bg-primary/5',
    icon: 'text-muted-foreground',
    ring: 'ring-primary/30',
  },
  moderate: {
    card: 'border-border hover:border-amber-500/40 hover:bg-amber-500/5',
    selected: 'border-amber-500 bg-amber-500/5',
    icon: 'text-amber-500',
    ring: 'ring-amber-500/30',
  },
  severe: {
    card: 'border-border hover:border-destructive/40 hover:bg-destructive/5',
    selected: 'border-destructive bg-destructive/5',
    icon: 'text-destructive',
    ring: 'ring-destructive/30',
  },
};

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'destructive' as const, icon: <Flag className="h-3 w-3" /> },
  REVIEWED: {
    label: 'Reviewed',
    variant: 'secondary' as const,
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  DISMISSED: {
    label: 'Dismissed',
    variant: 'outline' as const,
    icon: <XCircle className="h-3 w-3" />,
  },
};

const ACTION_LABELS: Record<NonNullable<ChatReportCase['lastAction']>, string> = {
  REVIEW: 'Marked as reviewed',
  DISMISS: 'Dismissed',
  DELETE_REPORTED_MESSAGE: 'Message deleted',
  TIMEOUT_10M: 'User timed out (10m)',
  TIMEOUT_1H: 'User timed out (1h)',
  BAN_CHAT: 'Chat banned',
  LIFT_CHAT_BAN: 'Chat ban lifted',
  BAN_PLATFORM: 'Platform banned',
  UNBAN_PLATFORM: 'Platform ban lifted',
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export default function ReportCasePageClient({ report }: ReportCasePageClientProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ReportModerationAction>('review');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMeta = ACTION_OPTIONS.find((o) => o.value === selectedAction)!;
  const requiresNote = Boolean(selectedMeta?.requiresNote);
  const isSevere = selectedMeta?.severity === 'severe';

  const statusConfig = STATUS_CONFIG[report.status];

  const submitAction = async () => {
    if (requiresNote && note.trim().length < 10) {
      toast.error('Please include at least 10 characters for enforcement context.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: selectedAction,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        toast.error(errorText || 'Failed to apply action');
        return;
      }

      toast.success('Report action applied');
      setNote('');
      router.refresh();
    } catch {
      toast.error('Failed to apply action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionGroups: Array<{ label: string; actions: ActionOption[] }> = [
    {
      label: 'Informational',
      actions: ACTION_OPTIONS.filter((a) => a.severity === 'info'),
    },
    {
      label: 'Moderation',
      actions: ACTION_OPTIONS.filter((a) => a.severity === 'moderate'),
    },
    {
      label: 'Severe',
      actions: ACTION_OPTIONS.filter((a) => a.severity === 'severe'),
    },
  ];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Report Case</h1>
            <Badge
              variant={statusConfig.variant}
              className="flex items-center gap-1.5 text-xs px-2 py-0.5"
            >
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{report.id}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin?tab=reports&reportId=${report.id}`)}
          className="shrink-0 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-5">
          {report.reportedMessage ? (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reported message
                </span>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm leading-relaxed break-words">{report.reportedMessage}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-5 flex items-center gap-3 text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              <span className="text-sm">No message content was captured with this report.</span>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <SectionLabel icon={<User className="h-3.5 w-3.5" />}>Parties</SectionLabel>
            </div>
            <div className="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Reporter">
                <span className="font-medium">{report.reporter}</span>
              </InfoRow>
              <InfoRow label="Target">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{report.target}</span>
                  {report.targetIsAdmin && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 text-amber-500 border-amber-500/40"
                    >
                      Admin
                    </Badge>
                  )}
                  {report.targetIsPlatformBanned && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 text-destructive border-destructive/40"
                    >
                      Platform banned
                    </Badge>
                  )}
                </div>
              </InfoRow>
              <InfoRow label="Channel">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {report.channelName}
                </span>
              </InfoRow>
              <InfoRow label="Reason">
                <span>{report.reason}</span>
              </InfoRow>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <SectionLabel icon={<Clock className="h-3.5 w-3.5" />}>Timeline</SectionLabel>
            </div>
            <div className="px-4 py-4 space-y-4">
              <InfoRow label="Filed">
                <span>
                  {format(new Date(report.createdAt), 'PPP p')}{' '}
                  <span className="text-muted-foreground text-xs">
                    ({formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })})
                  </span>
                </span>
              </InfoRow>
              {report.handledAt ? (
                <InfoRow label="Last handled">
                  <span>
                    {format(new Date(report.handledAt), 'PPP p')}{' '}
                    <span className="text-muted-foreground text-xs">
                      ({formatDistanceToNow(new Date(report.handledAt), { addSuffix: true })})
                    </span>
                  </span>
                </InfoRow>
              ) : null}
              <InfoRow label="Last action">
                {report.lastAction ? (
                  <span className="font-medium">{ACTION_LABELS[report.lastAction]}</span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </InfoRow>
              <InfoRow label="Handled by">
                {report.handledBy ? (
                  <span className="font-medium">{report.handledBy}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </InfoRow>
              {report.handlingNote ? (
                <div className="pt-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Last note
                  </span>
                  <p className="text-sm bg-muted/40 rounded-md px-3 py-2.5 leading-relaxed border border-border">
                    {report.handlingNote}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {report.targetIsAdmin && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400 leading-snug">
                <span className="font-semibold">Caution:</span> The reported user is a platform
                admin. Enforcement actions will still apply.
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="rounded-lg border border-border overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
              <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enforcement
              </span>
            </div>

            <div className="px-4 py-4 space-y-5">
              {/* Action selector */}
              <div className="space-y-3">
                {actionGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-1.5">
                      {group.actions.map((action) => {
                        const isSelected = selectedAction === action.value;
                        const styles = SEVERITY_STYLES[action.severity];
                        return (
                          <button
                            key={action.value}
                            type="button"
                            onClick={() => setSelectedAction(action.value)}
                            className={cn(
                              'w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-all cursor-pointer',
                              isSelected ? `${styles.selected} ring-1 ${styles.ring}` : styles.card
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 shrink-0',
                                isSelected ? styles.icon : 'text-muted-foreground'
                              )}
                            >
                              {action.icon}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-sm font-medium leading-tight',
                                  isSelected && action.severity === 'severe' && 'text-destructive',
                                  isSelected &&
                                    action.severity === 'moderate' &&
                                    'text-amber-600 dark:text-amber-400'
                                )}
                              >
                                {action.label}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                {action.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="note" className="text-xs">
                  Moderator note
                  {requiresNote ? (
                    <span className="text-destructive ml-1">*</span>
                  ) : (
                    <span className="text-muted-foreground ml-1">(optional)</span>
                  )}
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explain why this action is being taken."
                  rows={3}
                  className="text-sm resize-none"
                />
                {requiresNote && (
                  <p className="text-[11px] text-muted-foreground">Min. 10 characters required.</p>
                )}
              </div>

              {isSevere && (
                <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[12px] text-destructive leading-snug">
                    This is a severe action may often not be easily undone. Double-check before
                    applying.
                  </p>
                </div>
              )}

              <Button
                onClick={submitAction}
                disabled={isSubmitting}
                variant={isSevere ? 'destructive' : 'default'}
                className="w-full gap-2"
                size="sm"
              >
                <Gavel className="h-3.5 w-3.5" />
                {isSubmitting ? 'Applying…' : 'Apply action'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportCasePageClientProps {
  report: ChatReportCase;
}

interface ChatReportCase {
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
  targetUserId: string | null;
  targetIsAdmin: boolean;
  targetIsPlatformBanned: boolean;
  handledBy: string | null;
}
