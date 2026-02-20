import { ChatModerationCommand, User } from './ChatPanel';
import React from 'react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Ban, Bot, Clock3, EllipsisVertical, Eraser, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Message({
  user,
  message,
  type,
  emojiMap,
  msgId,
  canModerate,
  viewerId,
  onModerationCommand,
}: MessageProps) {
  if (type === 'systemMsg') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message}</span>
      </div>
    );
  }

  const canModerateTarget = type === 'message' && Boolean(user?.id) && !user?.isBot;

  return (
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
        {canModerateTarget && user ? (
          <ModerationMenu
            user={user}
            msgId={msgId}
            canModerate={canModerate}
            viewerId={viewerId}
            onModerationCommand={onModerationCommand}
          />
        ) : null}
      </div>
    </div>
  );
}

function ModerationMenu({
  user,
  msgId,
  canModerate,
  viewerId,
  onModerationCommand,
}: {
  user: User;
  msgId?: string;
  canModerate?: boolean;
  viewerId?: string;
  onModerationCommand?: (command: ChatModerationCommand) => void;
}) {
  if (!canModerate || !viewerId || !user.id || user.id === viewerId || !onModerationCommand) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => {
            if (!msgId) return;
            onModerationCommand({ type: 'mod:deleteMessage', msgId });
          }}
        >
          <Eraser className="mr-2 h-4 w-4" />
          Delete message
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onModerationCommand({
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
            onModerationCommand({
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
            onModerationCommand({
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
            onModerationCommand({
              type: 'mod:liftTimeout',
              targetUserId: user.id,
              targetUsername: user.displayName || user.username,
            });
          }}
        >
          <UserRoundCheck className="mr-2 h-4 w-4" />
          Lift timeout/ban
        </DropdownMenuItem>
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
  onModerationCommand?: (command: ChatModerationCommand) => void;
}

interface EmojiRendererProps {
  text: string;
  emojiMap: Map<string, string>;
}
