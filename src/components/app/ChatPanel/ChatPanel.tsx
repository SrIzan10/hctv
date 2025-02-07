'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChat } from '@livekit/components-react';

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const chat = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.chatMessages]);

  return (
    <div className="border-l flex flex-col w-[350px] min-w-[350px] h-full">
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col">
        <div className="space-y-4 flex-1">
          {chat.chatMessages.map((msg, i) => {
            const splitName = msg.from?.name?.split('-');
            const name = splitName?.slice(0, -1).join('-');
            return (
              // jank asf, but works (thanks claude)
              <div key={i} className="flex space-x-2">
                <div className="font-bold shrink-0">
                  {name}
                </div>
                <div
                  lang="en"
                  className="max-w-[calc(100%-4rem)] break-all whitespace-pre-wrap hyphens-auto"
                >
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                chat.send(message);
                setMessage('');
              }
            }}
            placeholder="Type a message"
            className="flex-1 bg-transparent focus-visible:ring-offset-0"
          />
          <Button size="icon" className="text-black transition-colors">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
