'use client';

import { ChatModerationCommand, User } from './ChatPanel';
import { useState } from 'react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Ban,
  Bot,
  Clock3,
  Crown,
  EllipsisVertical,
  Eraser,
  Flag,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ChannelRole = NonNullable<User['channelRole']>;

const ROLE_META: Record<ChannelRole, { label: string; icon: LucideIcon; className: string }> = {
  owner: { label: 'Owner', icon: Crown, className: 'text-amber-500' },
  manager: { label: 'Manager', icon: Wrench, className: 'text-violet-500' },
  chatModerator: { label: 'Chat Mod', icon: Shield, className: 'text-emerald-500' },
  botModerator: { label: 'Bot Mod', icon: ShieldCheck, className: 'text-cyan-500' },
};

function TooltipIcon({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Icon className={cn('size-3.5 shrink-0', className)} />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function UsernameRow({ user, displayName }: { user?: User; displayName?: string }) {
  const role = user?.channelRole ? ROLE_META[user.channelRole] : null;

  return (
    <TooltipProvider>
      <span className="font-semibold text-primary shrink-0 flex items-center gap-1">
        {user?.isBot && <TooltipIcon icon={Bot} label="Bot" className="text-muted-foreground" />}
        {role && <TooltipIcon icon={role.icon} label={role.label} className={role.className} />}
        {user?.isPlatformAdmin && (
          <TooltipIcon icon={ShieldAlert} label="Platform Admin" className="text-destructive" />
        )}
        <span>{displayName}</span>
        <span className="font-normal text-muted-foreground select-none">:</span>
      </span>
    </TooltipProvider>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  displayName,
  message,
  reportReason,
  onReasonChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName?: string;
  message: string;
  reportReason: string;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report message</DialogTitle>
          <DialogDescription>
            Message against Hack Club's Code of Conduct? Let us know!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
            <p className="font-medium text-foreground mb-1">Reported user</p>
            <p>{displayName}</p>
            <p className="mt-2">{message}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={reportReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Describe why this should be reviewed (harassment, hate speech, spam, threats, etc)."
              rows={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 10 characters.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || reportReason.trim().length < 10}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Message({
  user,
  message,
  type,
  emojiMap,
  msgId,
  canModerate,
  viewerId,
  channelName,
  onModerationCommand,
}: MessageProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const displayName = user?.displayName || user?.username;

  if (type === 'systemMsg') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message}</span>
      </div>
    );
  }

  const submitReport = async () => {
    if (!user?.id || !viewerId || viewerId === user.id) return;

    const reason = reportReason.trim();
    if (reason.length < 10) {
      toast.error('Please include at least 10 characters explaining the report.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/stream/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          targetUserId: user.id,
          targetUsername: displayName,
          msgId,
          message,
          reason,
        }),
      });

      if (!res.ok) {
        toast.error((await res.text()) || 'Failed to submit report.');
        return;
      }

      toast.success('Report submitted. Thanks for helping keep chat safe.');
      setReportReason('');
      setReportOpen(false);
    } catch {
      toast.error('Failed to submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleReportOpenChange = (open: boolean) => {
    setReportOpen(open);
    if (!open) setReportReason('');
  };

  return (
    <>
      <div className="group hover:bg-primary/5 rounded px-2 py-1 -mx-2 transition-colors">
        <div className="flex items-start gap-1.5">
          <UsernameRow user={user} displayName={displayName} />
          <span
            lang="en"
            className="text-foreground min-w-0 flex-1"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            <EmojiRenderer text={message} emojiMap={emojiMap} />
          </span>
          {type === 'message' && user?.id && (
            <MessageActionsMenu
              user={user}
              msgId={msgId}
              canModerate={canModerate}
              viewerId={viewerId}
              onModerationCommand={onModerationCommand}
              onOpenReport={() => setReportOpen(true)}
            />
          )}
        </div>
      </div>
      <ReportDialog
        open={reportOpen}
        onOpenChange={handleReportOpenChange}
        displayName={displayName}
        message={message}
        reportReason={reportReason}
        onReasonChange={setReportReason}
        onSubmit={submitReport}
        isSubmitting={isSubmittingReport}
      />
    </>
  );
}

function MessageActionsMenu({
  user,
  msgId,
  canModerate,
  viewerId,
  onModerationCommand,
  onOpenReport,
}: {
  user: User;
  msgId?: string;
  canModerate?: boolean;
  viewerId?: string;
  onModerationCommand?: (command: ChatModerationCommand) => void;
  onOpenReport: () => void;
}) {
  if (!viewerId || !user.id || user.id === viewerId) return null;

  const displayName = user.displayName || user.username;
  const canMod = Boolean(canModerate && onModerationCommand);

  const runModeration = (command: ChatModerationCommand) => onModerationCommand?.(command);

  const timeout = (durationSeconds: number) =>
    runModeration({
      type: 'mod:timeoutUser',
      targetUserId: user.id,
      targetUsername: displayName,
      durationSeconds,
      reason: 'Timed out by moderator',
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onOpenReport}>
          <Flag className="mr-2 h-4 w-4" />
          Report user
        </DropdownMenuItem>
        {canMod && (
          <>
            <DropdownMenuItem
              onClick={() => msgId && runModeration({ type: 'mod:deleteMessage', msgId })}
            >
              <Eraser className="mr-2 h-4 w-4" />
              Delete message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => timeout(300)}>
              <Clock3 className="mr-2 h-4 w-4" />
              Timeout 5 min
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => timeout(3600)}>
              <Clock3 className="mr-2 h-4 w-4" />
              Timeout 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                runModeration({
                  type: 'mod:banUser',
                  targetUserId: user.id,
                  targetUsername: displayName,
                  reason: 'Banned by moderator',
                })
              }
            >
              <Ban className="mr-2 h-4 w-4" />
              Ban user
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                runModeration({
                  type: 'mod:liftTimeout',
                  targetUserId: user.id,
                  targetUsername: displayName,
                })
              }
            >
              <UserRoundCheck className="mr-2 h-4 w-4" />
              Lift timeout/ban
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EmojiRenderer({ text, emojiMap }: { text: string; emojiMap: Map<string, string> }) {
  if (!text) return null;

  return (
    <TooltipProvider>
      <>
        {text.split(/(:[\w\-+]+:)/g).map((part, i) => {
          if (part.match(/^:[\w\-+]+:$/)) {
            const name = part.replaceAll(':', '');
            const url = emojiMap.get(name);
            if (url) {
              return (
                <Tooltip key={i} delayDuration={250}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center align-middle mx-0.5">
                      <Image src={url} alt={part} width={20} height={20} className="inline-block" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{part}</TooltipContent>
                </Tooltip>
              );
            }
          }
          return part ? <span key={i}>{part}</span> : null;
        })}
      </>
    </TooltipProvider>
  );
}

interface MessageProps {
  user?: User;
  message: string;
  type: 'message' | 'systemMsg';
  emojiMap: Map<string, string>;
  msgId?: string;
  canModerate?: boolean;
  viewerId?: string;
  channelName: string;
  onModerationCommand?: (command: ChatModerationCommand) => void;
}
