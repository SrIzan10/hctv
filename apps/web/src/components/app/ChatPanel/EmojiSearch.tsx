// source: ai
import { useEffect, useState, useRef } from 'react';
import { Check } from 'lucide-react';
import Image from 'next/image';

interface EmojiSearchProps {
  message: string;
  cursorPosition: number;
  onSelect: (emoji: string) => void;
  socket: WebSocket | null;
  emojiMap: Map<string, string>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function EmojiSearch({
  message,
  cursorPosition,
  onSelect,
  socket,
  emojiMap,
  textareaRef,
}: EmojiSearchProps) {
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const beforeCursor = message.substring(0, cursorPosition);
    const match = beforeCursor.match(/:[\w\-+]*$/);
    
    if (match) {
      const term = match[0].substring(1);
      setSearchTerm(term);
      
      if (term.length > 0) {
        const localResults = Array.from(emojiMap.keys())
          .filter(name => name.toLowerCase().includes(term.toLowerCase()))
          .slice(0, 5);
        
        if (localResults.length > 0) {
          setSearchResults(localResults);
        }
        
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'emojiSearch',
            searchTerm: term
          }));
        }
      } else {
        setSearchResults([]);
      }
    } else {
      setSearchTerm(null);
      setSearchResults([]);
    }
  }, [message, cursorPosition, socket, emojiMap]);

  useEffect(() => {
    if (!socket) return;

    const handleEmojiSearchResponse = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'emojiSearchResponse') {
          const serverResults = data.results || [];
          
          const localResults = Array.from(emojiMap.keys())
            .filter(name => searchTerm && name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
            
          const combinedResults = [...serverResults];
          
          localResults.forEach(name => {
            if (!combinedResults.includes(name)) {
              combinedResults.push(name);
            }
          });
          
          setSearchResults(combinedResults.slice(0, 10));
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error('error processing emoji search response:', e);
      }
    };

    socket.addEventListener('message', handleEmojiSearchResponse);
    return () => {
      socket.removeEventListener('message', handleEmojiSearchResponse);
    };
  }, [socket, searchTerm, emojiMap]);

  useEffect(() => {
    if (!textareaRef.current) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchTerm || searchResults.length === 0) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % searchResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
          break;
        case 'Enter':
          if (searchResults[selectedIndex]) {
            e.preventDefault();
            onSelect(searchResults[selectedIndex]);
          }
          break;
        case 'Tab':
          if (searchResults[selectedIndex]) {
            e.preventDefault();
            onSelect(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSearchTerm(null);
          setSearchResults([]);
          break;
      }
    };
    
    const textarea = textareaRef.current;
    textarea.addEventListener('keydown', handleKeyDown);
    
    return () => {
      textarea.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchTerm, searchResults, selectedIndex, onSelect, textareaRef]);

  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!searchTerm || searchResults.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-16 left-4 bg-mantle border rounded-md shadow-lg max-h-60 overflow-y-auto z-10 min-w-[200px] max-w-[300px]">
      <div ref={resultsRef} className="py-1">
        {searchResults.map((emojiName, index) => {
          const isSelected = index === selectedIndex;
          const emojiUrl = emojiMap.get(emojiName);
          
          return (
            <div
              key={emojiName}
              className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                isSelected ? 'bg-primary/10' : 'hover:bg-primary/5'
              }`}
              onClick={() => onSelect(emojiName)}
            >
              {emojiUrl && (
                <Image src={emojiUrl} alt={emojiName} width={20} height={20} className="w-5 h-5" />
              )}
              <span className="flex-grow text-sm">{emojiName}</span>
              {isSelected && <Check className="h-4 w-4 text-blue-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
