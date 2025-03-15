'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';

export default function ChatPanel() {
  const { username } = useParams();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(
      `ws${window.location.protocol === 'https:' ? 's' : ''}://${
        window.location.host
      }/api/stream/chat/${username}`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setChatMessages((prev) => [...prev, data]);
      } catch (e) {
        console.log('Received message confirmation:', event.data);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (chatMessages.length > 100) {
      setChatMessages((prev) => prev.slice(chatMessages.length - 100));
    }
  }, [chatMessages]);

  const sendMessage = () => {
    if (!message.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
      setMessage('');
    } else {
      const socket = new WebSocket(
        `ws${window.location.protocol === 'https:' ? 's' : ''}://${
          window.location.host
        }/api/stream/chat/${username}`
      );
      socket.onopen = () => {
        socket.send(message);
        setMessage('');
      };
    }
  };

  return (
    <div className="border-l flex flex-col w-[350px] min-w-[350px] h-full">
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col">
        <div className="space-y-4 flex-1">
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex space-x-2">
              <div className="flex items-center gap-2">
                <div className="font-bold shrink-0">{msg.user.username}</div>
              </div>
              <div
                lang="en"
                className="max-w-[calc(100%-4rem)] break-all whitespace-pre-wrap hyphens-auto"
              >
                {msg.message}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
            placeholder="Type a message"
            className="flex-1 bg-transparent focus-visible:ring-offset-0"
          />
          <Button size="icon" className="text-black transition-colors" onClick={sendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface User {
  id: string;
  username: string;
  pfpUrl: string;
}

interface ChatMessage {
  user: User;
  message: string;
}
