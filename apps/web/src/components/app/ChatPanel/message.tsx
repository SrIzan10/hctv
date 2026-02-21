'use client';

import { ChatModerationCommand, User } from './ChatPanel';
import React, { useState } from 'react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Ban, Bot, Clock3, EllipsisVertical, Eraser, Flag, UserRoundCheck } from 'lucide-react';
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

  if (type === 'systemMsg') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message}</span>
      </div>
    );
  }

  const hasTargetUser = type === 'message' && Boolean(user?.id);

  const submitReport = async () => {
    if (!user?.id || !viewerId || viewerId === user.id) {
      return;
    }

    const reason = reportReason.trim();
    if (reason.length < 10) {
      toast.error('Please include at least 10 characters explaining the report.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const response = await fetch('/api/stream/chat/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName,
          targetUserId: user.id,
          targetUsername: user.displayName || user.username,
          msgId,
          message,
          reason,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(errorText || 'Failed to submit report.');
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

  return (
    <>
      <div className="group hover:bg-primary/5 rounded px-2 py-1 -mx-2 transition-colors">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-primary shrink-0 flex items-center gap-1">
            {user?.isBot && <Bot className="size-4 text-muted-foreground" />}
            <span>{user?.displayName || user?.username}</span>
          </span>
          <span
            lang="en"
            className="text-foreground break-words overflow-wrap-anywhere min-w-0 flex-1"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            <EmojiRenderer text={message} emojiMap={emojiMap} />
          </span>
          {hasTargetUser && user ? (
            <MessageActionsMenu
              user={user}
              msgId={msgId}
              canModerate={canModerate}
              viewerId={viewerId}
              onModerationCommand={onModerationCommand}
              onOpenReport={() => setReportOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) {
            setReportReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report message</DialogTitle>
            <DialogDescription>
              Tell us what happened. Your report helps moderators review abusive behavior.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
              <p className="font-medium text-foreground mb-1">Reported user</p>
              <p>{user?.displayName || user?.username}</p>
              <p className="mt-2">{message}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="Describe why this should be reviewed (harassment, hate speech, spam, threats, etc)."
                rows={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 10 characters.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReport}
              disabled={isSubmittingReport || reportReason.trim().length < 10}
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  if (!viewerId || !user.id || user.id === viewerId) {
    return null;
  }

  const canModerateTarget = Boolean(canModerate && onModerationCommand);

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

        {canModerateTarget ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                if (!msgId) return;
                onModerationCommand?.({ type: 'mod:deleteMessage', msgId });
              }}
            >
              <Eraser className="mr-2 h-4 w-4" />
              Delete message
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onModerationCommand?.({
                  type: 'mod:timeoutUser',
                  targetUserId: user.id,
                  targetUsername: user.displayName || user.username,
                  durationSeconds: 300,
                  reason: 'Timed out by moderator',
                });
              }}
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Timeout 5 min
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onModerationCommand?.({
                  type: 'mod:timeoutUser',
                  targetUserId: user.id,
                  targetUsername: user.displayName || user.username,
                  durationSeconds: 3600,
                  reason: 'Timed out by moderator',
                });
              }}
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Timeout 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                onModerationCommand?.({
                  type: 'mod:banUser',
                  targetUserId: user.id,
                  targetUsername: user.displayName || user.username,
                  reason: 'Banned by moderator',
                });
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              Ban user
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onModerationCommand?.({
                  type: 'mod:liftTimeout',
                  targetUserId: user.id,
                  targetUsername: user.displayName || user.username,
                });
              }}
            >
              <UserRoundCheck className="mr-2 h-4 w-4" />
              Lift timeout/ban
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EmojiRenderer({ text, emojiMap }: EmojiRendererProps) {
  if (!text) return null;

  const parts = text.split(/(:[\w\-+]+:)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^:[\w\-+]+:$/)) {
          const emojiName = part.replaceAll(':', '');
          const emojiUrl = emojiMap.get(emojiName);

          if (emojiUrl) {
            return (
              <TooltipProvider key={index}>
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center align-middle mx-0.5">
                      <Image
                        src={emojiUrl}
                        alt={part}
                        width={20}
                        height={20}
                        className="inline-block"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{part}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
        }

        // Preserve text as-is, handling whitespace properly
        if (part) {
          return <span key={index}>{part}</span>;
        }
        return null;
      })}
    </>
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

interface EmojiRendererProps {
  text: string;
  emojiMap: Map<string, string>;
}
