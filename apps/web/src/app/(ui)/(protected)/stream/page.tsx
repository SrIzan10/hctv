'use client';

import { useEffect, useState } from 'react';
import { ChannelSelect } from '@/components/app/ChannelSelect/ChannelSelect';
import { Button } from '@/components/ui/button';
import { useChannelStreamKey } from '@/lib/hooks/useChannelStreamKey';
import { useOwnedChannels } from '@/lib/hooks/useUserList';
import { useScreensharePublisher } from '@/lib/hooks/useScreensharePublisher';

export default function Page() {
  const [selectedChannel, setSelectedChannel] = useState('');
  const { channels, isLoading: isLoadingChannels } = useOwnedChannels();
  const ownedChannels = channels.map(({ channel }) => channel);
  const {
    streamKey,
    error: streamKeyError,
    isLoading: isLoadingStreamKey,
  } = useChannelStreamKey(selectedChannel || undefined);
  const {
    changeSource,
    error,
    isLive,
    isSessionActive,
    isStarting,
    isSwitchingSource,
    previewRef,
    startPublishing,
    stopPublishing,
  } = useScreensharePublisher({
    channelName: selectedChannel,
    streamKey,
  });

  const hasChannels = ownedChannels.length > 0;
  const canStartPublishing =
    !isSessionActive && Boolean(selectedChannel) && Boolean(streamKey) && !isLoadingStreamKey;
  const channelPlaceholder = isLoadingChannels ? 'Loading channels...' : 'Select a channel';

  useEffect(() => {
    if (isSessionActive) {
      return;
    }

    if (!ownedChannels.some((channel) => channel.name === selectedChannel)) {
      setSelectedChannel(ownedChannels[0]?.name ?? '');
    }
  }, [isSessionActive, ownedChannels, selectedChannel]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Start a screenshare stream, then switch windows, tabs, or displays without ending the
        broadcast.
      </p>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <p className="text-sm font-medium">Channel</p>
          <ChannelSelect
            channelList={ownedChannels}
            disabled={isSessionActive || isLoadingChannels || !hasChannels}
            placeholder={channelPlaceholder}
            value={selectedChannel || undefined}
            onSelect={setSelectedChannel}
            triggerClassName="w-full"
          />
        </div>
      </div>

      {!hasChannels && !isLoadingChannels ? (
        <p className="text-sm text-muted-foreground">
          You need at least one channel before you can publish.
        </p>
      ) : null}

      {streamKeyError ? <p className="text-sm text-destructive">{streamKeyError.message}</p> : null}

      <video
        ref={previewRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-md bg-black"
      />

      <div className="flex gap-2">
        <Button onClick={startPublishing} disabled={!canStartPublishing} loading={isStarting}>
          Start
        </Button>
        <Button
          variant="outline"
          onClick={changeSource}
          disabled={!isLive}
          loading={isSwitchingSource}
        >
          Change source
        </Button>
        <Button onClick={stopPublishing} disabled={!isSessionActive || isSwitchingSource}>
          Stop
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
