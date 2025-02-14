'use client';

import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/services/swr';
import { Heart, HeartCrack } from 'lucide-react';
import { useHover } from '@uidotdev/usehooks';
import useSWR from 'swr/mutation';
import React from 'react';

export default function FollowButton(props: Props) {
  const [ref, isHovering] = useHover();
  const [following, setFollowing] = React.useState(props.isFollowing);
  const { trigger, data, isMutating } = useSWR(
    `/api/stream/follow?username=${props.channel}`,
    async (url) => fetcher(url, { method: 'POST' })
  );

  React.useEffect(() => {
    if (data) {
      setFollowing(data.following);
    }
  }, [data]);

  return (
    <Button
      size={'icon'}
      onClick={() => trigger()}
      disabled={isMutating}
      ref={ref}
      variant={following ? 'destructive' : 'default'}
    >
      {isHovering && following ? <HeartCrack /> : <Heart />}
    </Button>
  );
}

interface Props {
  channel: string;
  isFollowing: boolean;
}
