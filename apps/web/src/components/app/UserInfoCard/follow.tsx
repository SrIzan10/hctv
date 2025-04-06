'use client';

import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/services/swr';
import { Heart, HeartCrack } from 'lucide-react';
import { useHover } from '@uidotdev/usehooks';
import useSWR from 'swr';
import mutatedUseSWR from 'swr/mutation';
import React from 'react';

export default function FollowButton(props: Props) {
  const [ref, isHovering] = useHover();
  const [bye, setBye] = React.useState(false);
  const { data: followingData, isLoading: isLoadingFollowing } = useSWR(
    `/api/stream/follow?username=${props.channel}`, 
    async (url) => fetcher(url)
  );
  const [following, setFollowing] = React.useState(false);
  const { trigger, data, isMutating } = mutatedUseSWR(
    `/api/stream/follow?username=${props.channel}`,
    async (url) => fetcher(url, { method: 'POST' })
  );

  React.useEffect(() => {
    if (!isLoadingFollowing && followingData) {
      setFollowing(followingData.following);
    }
    if (!isLoadingFollowing && followingData === undefined) {
      setBye(true);
    }
  }, [followingData, isLoadingFollowing]);

  React.useEffect(() => {
    if (data) {
      setFollowing(data.following);
    }
  }, [data]);

  const followingCn = 'text-destructive';
  const notFollowingCn = 'text-white';
  return (
    <Button
      size={'icon'}
      onClick={() => trigger()}
      disabled={isMutating || isLoadingFollowing}
      ref={ref}
      variant='outlineMantle'
      className={bye ? 'hidden' : ''}
    >
      {isHovering && following ? <HeartCrack className={followingCn} /> : <Heart className={following ? followingCn : notFollowingCn} />}
    </Button>
  );
}

interface Props {
  channel: string;
}
