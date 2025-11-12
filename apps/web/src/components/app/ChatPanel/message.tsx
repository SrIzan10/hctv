import { User } from './ChatPanel';
import React from 'react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';

export function Message({ user, message, type, emojiMap }: MessageProps) {
  if (type === 'systemMsg') {
    return (
      <div className="flex items-center justify-center">
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    );
  }

  return (
    <div className="flex">
      <div lang="en" className="max-w-full break-all whitespace-pre-wrap hyphens-auto">
        <p className="flex flex-wrap items-center">
          <span className="font-bold mr-2 flex items-center">
            {user?.isBot && (
              <span className="text-xs text-muted-foreground flex mr-1">
                {' '}
                <Bot className="size-5" />
              </span>
            )}
            {user?.displayName || user?.username}
          </span>

          <EmojiRenderer text={message} emojiMap={emojiMap} />
        </p>
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
                  <TooltipTrigger>
                    <span
                      key={index}
                      className="inline-block align-middle"
                      style={{ height: '1.2em' }}
                    >
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

        return <span key={index}>{part}</span>;
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
