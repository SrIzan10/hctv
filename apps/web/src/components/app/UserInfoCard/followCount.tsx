'use client';

import { fetcher } from '@/lib/services/swr';
import useSWR from 'swr';


// TODO: rerender the component when the user follows/unfollows the channel
export default function FollowCountText({ channel }: { channel: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/stream/followers/${channel}`,
    fetcher
  );

  if (isLoading || !data) {
    return <p className="text-sm italic text-muted-foreground">Loading followers...</p>;
  }
  if (error) {
    return <p className="text-sm italic text-muted-foreground">Failed to load followers</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      {data.count} follower{data.count === 1 ? '' : 's'}
    </p>
  );
}
