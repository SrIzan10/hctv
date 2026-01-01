'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import StreamPlayer from '../StreamPlayer/StreamPlayer';
import UserInfoCard from '../UserInfoCard/UserInfoCard';
import ChatPanel from '../ChatPanel/ChatPanel';
import { Button } from '@/components/ui/button';
import type { StreamInfo, Channel } from '@hctv/db';
import { useIsMobile } from '@/lib/hooks/useMobile';
import { useAllChannels } from '@/lib/hooks/useUserList';
import { RefreshCw } from 'lucide-react';

export default function LiveStream(props: Props) {
  const isMobile = useIsMobile();
  const { channels, refresh } = useAllChannels(5000);
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictionExpiresAt, setRestrictionExpiresAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const currentStream = channels.find(s => s.username === props.username);
    if (currentStream?.channel?.isRestricted) {
      setIsRestricted(true);
      setRestrictionExpiresAt(currentStream.channel.restrictionExpiresAt || null);
    } else if (isRestricted && currentStream && !currentStream.channel?.isRestricted) {
      setIsRestricted(false);
      setRestrictionExpiresAt(null);
    }
  }, [channels, props.username, isRestricted]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Channel Restricted</h1>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          This channel has been restricted by a moderator and is no longer available for viewing.
        </p>
        {restrictionExpiresAt && (
          <p className="text-sm text-muted-foreground mb-4">
            Restriction lifts: {format(new Date(restrictionExpiresAt), 'PPP p')}
          </p>
        )}
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Checking...' : 'Check again'}
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`${isMobile ? 'flex flex-col' : 'flex'} h-[calc(100vh-64px)] w-full`}>
      <div className="flex-1 flex flex-col">
        <StreamPlayer />
        {isMobile && (
          <div className="h-[300px]">
            <ChatPanel />
          </div>
        )}
        <UserInfoCard streamInfo={props.streamInfo} />
      </div>
      
      {!isMobile && (
        <div>
          <ChatPanel />
        </div>
      )}
    </div>
  );
}

interface Props {
  username: string;
  streamInfo: StreamInfo & { channel: Channel };
}