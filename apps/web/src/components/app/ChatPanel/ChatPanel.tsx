'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { Message } from './message';
import { useMap } from '@uidotdev/usehooks';

export default function ChatPanel() {
  const { username } = useParams();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const emojiMap = useMap() as Map<string, string>;
  const [emojisToReq, setEmojisToReq] = useState<string[]>([]);

  useEffect(() => {
    console.log('Initializing WebSocket connection for user:', username);
    const socket = new WebSocket(
      `ws${window.location.protocol === 'https:' ? 's' : ''}://${
        window.location.host
      }/api/stream/chat/ws/${username}`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received websocket message:', data);

        if (data.type === 'history') {
          const messages = data.messages as ChatMessage[];
          setChatMessages((prev) => [
            ...prev,
            ...messages,
            { message: 'Welcome to the chat!', type: 'systemMsg' },
          ]);
          return;
        }

        if (data.type === 'message') {
          console.log('Adding new chat message:', data);
          setChatMessages((prev) => [...prev, data]);
        }

        // Handle plain message object (backwards compatibility)
        if (!data.type && data.message && data.user) {
          console.log('Adding legacy chat message format:', data);
          setChatMessages((prev) => [...prev, { ...data, type: 'message' }]);
        }
      } catch (e) {
        console.error('Error processing message:', e);
        console.log('Raw message data:', event.data);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      socket.close();
    };
  }, [username]);

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
      socketRef.current.send(JSON.stringify({ type: 'message', message }));
      setMessage('');
    } else {
      const socket = new WebSocket(
        `ws${window.location.protocol === 'https:' ? 's' : ''}://${
          window.location.host
        }/api/stream/chat/ws/${username}`
      );
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'message', message }));
        setMessage('');
      };
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
        console.log('Sent ping to keep connection alive');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // emoji message collector
  useEffect(() => {
    if (chatMessages.length === 0) return;

    const emojiPattern = /:[\w\-+]+:/g;
    const newEmojis = chatMessages
      .filter((msg) => msg.type === 'message')
      .flatMap((msg) => {
        if (!msg.message) return [];
        // Ensure message is a string before matching
        const message = String(msg.message);
        const matches = [...message.matchAll(emojiPattern)].map((m) => m[0]);
        return matches;
      })
      .filter((emoji) => {
        // Only request emojis we don't already have
        // Note: emoji has colons, but emojiMap keys don't have colons
        const emojiName = emoji.replaceAll(':', '');
        return !emojiMap.has(emojiName) && emojiName.length > 0;
      });

    if (newEmojis.length > 0) {
      console.log(`Found ${newEmojis.length} new emojis to request: ${newEmojis.join(', ')}`);
      setEmojisToReq((prev) => [...new Set([...prev, ...newEmojis])]);
    }
  }, [chatMessages, emojiMap]);

  // emoji requester
  useEffect(() => {
    if (emojisToReq.length === 0) return;

    console.log('Requesting emojis:', emojisToReq);

    // Ensure websocket is connected
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      const socket = new WebSocket(
        `ws${window.location.protocol === 'https:' ? 's' : ''}://${
          window.location.host
        }/api/stream/chat/ws/${username}`
      );

      socket.onopen = () => {
        socketRef.current = socket;
        sendEmojiRequest();
      };

      return () => {
        socket.close();
      };
    } else {
      sendEmojiRequest();
    }

    function sendEmojiRequest() {
      const handleEmojiResponse = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'emojiMsgResponse') {
            const emojis = data.emojis as Record<string, string>;

            let validEmojiCount = 0;
            Object.entries(emojis).forEach(([name, url]) => {
              if (url) {
                emojiMap.set(name, url);
                validEmojiCount++;
              } else {
                console.log(`No URL found for emoji: ${name}`);
              }
            });

            console.log(
              `added ${validEmojiCount} valid emojis to map.`
            );

            if (validEmojiCount > 0) {
              const sampleName = Object.entries(emojis).find(([_, url]) => url)?.[0];
              if (sampleName) {
              }
            } else {
              console.warn('No valid emoji URLs received');
            }
          }
        } catch (e) {
          console.error('error processing emoji response:', e);
        }
      };

      socketRef.current?.addEventListener('message', handleEmojiResponse);

      const emojiRequest = {
        type: 'emojiMsg',
        emojis: emojisToReq.map((e) => e.replaceAll(':', '')),
      };

      console.log('sending emoji request:', emojiRequest);
      socketRef.current?.send(JSON.stringify(emojiRequest));

      return () => {
        socketRef.current?.removeEventListener('message', handleEmojiResponse);
        setEmojisToReq([]);
      };
    }
  }, [emojisToReq, emojiMap, username]);

  return (
    <div className="md:border flex flex-col w-[350px] max-w-[350px] h-full bg-mantle">
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col">
        <div className="space-y-4 flex-1">
          {chatMessages.map((msg, i) => (
            <Message
              key={i}
              user={msg.user}
              message={msg.message}
              type={msg.type}
              emojiMap={emojiMap}
            />
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

export interface ChatMessage {
  user?: User;
  message: string;
  type: 'message' | 'systemMsg';
}

export interface User {
  id: string;
  username: string;
  pfpUrl: string;
}
