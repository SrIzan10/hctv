'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useStreams } from '@/lib/providers/StreamInfoProvider';

export default function StreamUptime() {
  const { stream, isLoading } = useStreams();
  const { username } = useParams<{ username: string }>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const startedAt = useMemo(() => {
    if (!stream || !username) {
      return null;
    }

    const currentStream = stream.find((entry) => entry.username === username);
    if (!currentStream?.isLive) {
      return null;
    }

    return new Date(currentStream.startedAt).getTime();
  }, [stream, username]);

  if (isLoading || !startedAt) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Clock3 className="h-4 w-4" />
      <span>{`${hours}:${minutes}:${seconds}`}</span>
    </div>
  );
}
