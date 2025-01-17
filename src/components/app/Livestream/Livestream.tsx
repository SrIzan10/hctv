'use client';

import { LiveKitRoom } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import StreamPlayer from '../StreamPlayer/StreamPlayer';

export default function LiveStream({ username }: { username: string }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch(`/api/livekit/viewerToken?room=${username}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [username]);

  if (!token) return <div>Loading...</div>;

  return (
    <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true}>
      <StreamPlayer />
    </LiveKitRoom>
  );
}
