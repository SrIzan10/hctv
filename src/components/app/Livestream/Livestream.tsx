'use client';

import { LiveKitRoom } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import StreamPlayer from '../StreamPlayer/StreamPlayer';
import UserInfoCard from '../UserInfoCard/UserInfoCard';
import ChatPanel from '../ChatPanel/ChatPanel';
import type { StreamInfo, User } from '@prisma/client';

export default function LiveStream(props: Props) {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch(`/api/livekit/viewerToken?room=${props.username}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [props.username]);

  if (!token) return <div>Loading...</div>;

  return (
    <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true}>
      <div className="flex h-[calc(100vh-64px)] w-full">
        <div className="flex-1">
          <StreamPlayer />
          <UserInfoCard streamInfo={props.streamInfo} />
        </div>
        <ChatPanel />
      </div>
    </LiveKitRoom>
  );
}

interface Props {
  username: string;
  streamInfo: StreamInfo & { ownedBy: User };
}