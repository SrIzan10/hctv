'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { Message } from './message';
import { useMap } from '@uidotdev/usehooks';
import { EmojiSearch } from './EmojiSearch';
import { useQueryState } from 'nuqs';

export default function ChatPanel(props: Props) {
  const { username } = useParams();
  const [grant, setGrant] = useQueryState('grant');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const emojiMap = useMap() as Map<string, string>;
  const [emojisToReq, setEmojisToReq] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    console.log(grant)
  }, [grant]);
  useEffect(() => {
    console.log('Initializing WebSocket connection for user:', username);
    const socket = new WebSocket(
      `ws${window.location.protocol === 'https:' ? 's' : ''}://${
        window.location.host
      }/api/stream/chat/ws/${username}?grant=${grant}`
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
        }/api/stream/chat/ws/${username}?grant=${grant}`
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
        const message = String(msg.message);
        const matches = [...message.matchAll(emojiPattern)].map((m) => m[0]);
        return matches;
      })
      .filter((emoji) => {
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
        }/api/stream/chat/ws/${username}?grant=${grant}`
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

            console.log(`added ${validEmojiCount} valid emojis to map.`);

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

  const handleEmojiSelect = (emojiName: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);

    const match = beforeCursor.match(/:[\w\-+]*$/);
    if (!match) return;

    const startPos = beforeCursor.lastIndexOf(match[0]);
    const newBeforeCursor = beforeCursor.substring(0, startPos);

    const newMessage = `${newBeforeCursor}:${emojiName}: ${afterCursor}`;
    setMessage(newMessage);

    // 3 for colons and space
    const newCursorPos = newBeforeCursor.length + emojiName.length + 3;

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      setCursorPosition(newCursorPos);
    }, 0);
  };

  const isEmojiSearchOpen = () => {
    const beforeCursor = message.substring(0, cursorPosition);
    const match = beforeCursor.match(/:[\w\-+]*$/);
    return match !== null;
  };

  return (
    <div className={`${props.isObsPanel ? 'w-full text-white' : 'md:border bg-mantle w-[350px] max-w-[350px]'} flex flex-col h-full`}>
      <div ref={scrollRef} className={`flex-1 p-4 ${props.isObsPanel ? 'scrollbar-hide' : ''} overflow-y-auto flex flex-col`}>
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
      {!props.isObsPanel && (
        <div className="p-4 border-t relative">
          <div className="flex space-x-2">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setCursorPosition(e.target.selectionStart || 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isEmojiSearchOpen()) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onKeyUp={(e) => {
                setCursorPosition(e.currentTarget.selectionStart || 0);
              }}
              onClick={(e) => {
                setCursorPosition(e.currentTarget.selectionStart || 0);
              }}
              placeholder="Type a message"
              className="flex-1 bg-transparent focus-visible:ring-offset-0 min-h-[40px] max-h-[120px] resize-none py-2"
              rows={1}
            />
            <Button size="icon" className="text-black transition-colors" onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <EmojiSearch
            message={message}
            cursorPosition={cursorPosition}
            onSelect={handleEmojiSelect}
            socket={socketRef.current}
            emojiMap={emojiMap}
            textareaRef={textareaRef}
          />
        </div>
      )}
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

interface Props {
  isObsPanel?: boolean;
}
