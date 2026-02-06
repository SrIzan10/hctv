import { User } from './ChatPanel';
import React from 'react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';

export function Message({ user, message, type, emojiMap }: MessageProps) {
  if (type === 'systemMsg') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground italic">{message}</span>
      </div>
    );
  }

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
      </div>
    </div>
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
}

interface EmojiRendererProps {
  text: string;
  emojiMap: Map<string, string>;
}
