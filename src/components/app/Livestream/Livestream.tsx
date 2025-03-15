'use client';

import StreamPlayer from '../StreamPlayer/StreamPlayer';
import UserInfoCard from '../UserInfoCard/UserInfoCard';
import ChatPanel from '../ChatPanel/ChatPanel';
import type { StreamInfo, User } from '@prisma/client';

export default function LiveStream(props: Props) {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      <div className="flex-1">
        <StreamPlayer />
        <UserInfoCard streamInfo={props.streamInfo} />
      </div>
      <ChatPanel />
    </div>
  );
}

interface Props {
  username: string;
  streamInfo: StreamInfo & { ownedBy: User };
}
