'use client';

import StreamPlayer from '../StreamPlayer/StreamPlayer';
import UserInfoCard from '../UserInfoCard/UserInfoCard';
import ChatPanel from '../ChatPanel/ChatPanel';
import type { StreamInfo, User, Channel } from '@hctv/db';
import { useIsMobile } from '@/lib/hooks/useMobile';

export default function LiveStream(props: Props) {
  const isMobile = useIsMobile();
  
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