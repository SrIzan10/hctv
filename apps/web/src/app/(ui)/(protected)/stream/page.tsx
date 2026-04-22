'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { ChannelSelect } from '@/components/app/ChannelSelect/ChannelSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChannelStreamKey } from '@/lib/hooks/useChannelStreamKey';
import { useOwnedChannels } from '@/lib/hooks/useUserList';
import { useScreensharePublisher } from '@/lib/hooks/useScreensharePublisher';
import { getMediamtxClientRegionOptions } from '@/lib/utils/mediamtx/client';
import type { MediaMTXRegion } from '@/lib/utils/mediamtx/regions';

export default function Page() {
  const serverOptions = getMediamtxClientRegionOptions();
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<MediaMTXRegion>(
    serverOptions[0]?.value ?? 'hq'
  );
  const { channels, isLoading: isLoadingChannels } = useOwnedChannels();
  const ownedChannels = channels.map(({ channel }) => channel);
  const {
    streamKey,
    error: streamKeyError,
    isLoading: isLoadingStreamKey,
  } = useChannelStreamKey(selectedChannel || undefined);
  const {
    browserWarning,
    changeSource,
    issue,
    isLive,
    isSessionActive,
    isStarting,
    isSwitchingSource,
    publishState,
    previewRef,
    startPublishing,
    stopPublishing,
  } = useScreensharePublisher({
    channelName: selectedChannel,
    region: selectedRegion,
    streamKey,
  });

  const hasChannels = ownedChannels.length > 0;
  const hasServerOptions = serverOptions.length > 0;
  const canStartPublishing =
    !isSessionActive && Boolean(selectedChannel) && Boolean(streamKey) && !isLoadingStreamKey;
  const channelPlaceholder = isLoadingChannels ? 'Loading channels...' : 'Select a channel';
  const statusMeta = getStatusMeta(publishState);
  const primaryIssue = issue ?? browserWarning;

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

      <div className="grid gap-4 md:grid-cols-[220px_220px]">
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

        <div className="space-y-2">
          <p className="text-sm font-medium">Server</p>
          <Select
            value={selectedRegion}
            onValueChange={(value) => setSelectedRegion(value as MediaMTXRegion)}
            disabled={isSessionActive || !hasServerOptions}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select server" />
            </SelectTrigger>
            <SelectContent>
              {serverOptions.map((server) => (
                <SelectItem key={server.value} value={server.value}>
                  {server.label} {server.emoji}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasChannels && !isLoadingChannels ? (
        <p className="text-sm text-muted-foreground">
          You need at least one channel before you can publish.
        </p>
      ) : null}

      <Card className={statusMeta.cardClassName}>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex items-start gap-3">
            <statusMeta.icon className={`mt-0.5 h-5 w-5 shrink-0 ${statusMeta.iconClassName}`} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{statusMeta.title}</p>
                <Badge variant={statusMeta.badgeVariant}>{statusMeta.badgeLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{statusMeta.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {streamKeyError ? (
        <ActionPanel
          actions={
            <Button onClick={() => window.location.reload()} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload page
            </Button>
          }
          description={getStreamKeyErrorDescription(streamKeyError.message)}
          icon={CircleAlert}
          title="Could not load the stream key"
          tone="destructive"
        />
      ) : null}

      {primaryIssue ? (
        <ActionPanel
          actions={
            <>
              {!isSessionActive && primaryIssue.context !== 'warning' ? (
                <Button onClick={startPublishing} disabled={!canStartPublishing} size="sm">
                  Try again
                </Button>
              ) : null}

              {primaryIssue.context === 'switch' && isLive ? (
                <Button
                  onClick={changeSource}
                  disabled={isSwitchingSource}
                  loading={isSwitchingSource}
                  size="sm"
                >
                  Try switching again
                </Button>
              ) : null}

              {isSessionActive && primaryIssue.context !== 'warning' ? (
                <Button onClick={stopPublishing} size="sm" variant="outline">
                  Stop stream
                </Button>
              ) : null}
            </>
          }
          description={primaryIssue.description}
          icon={primaryIssue.tone === 'warning' ? AlertTriangle : CircleAlert}
          title={primaryIssue.title}
          tone={primaryIssue.tone}
        />
      ) : null}

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
    </div>
  );
}

function ActionPanel({ actions, description, icon: Icon, title, tone }: ActionPanelProps) {
  const isWarning = tone === 'warning';

  return (
    <div
      className={
        isWarning
          ? 'rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-foreground'
          : 'rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-foreground'
      }
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${isWarning ? 'text-amber-500' : 'text-destructive'}`}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {actions ? <div className="flex gap-2 md:shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

function getStatusMeta(publishState: PublishState) {
  switch (publishState) {
    case 'connecting':
      return {
        badgeLabel: 'Starting',
        badgeVariant: 'secondary' as const,
        cardClassName: 'border-blue-500/30 bg-blue-500/5',
        description: 'Approve the browser picker and keep this page open while we connect.',
        icon: LoaderCircle,
        iconClassName: 'animate-spin text-blue-500',
        title: 'Preparing your stream',
      };
    case 'live':
      return {
        badgeLabel: 'Live',
        badgeVariant: 'default' as const,
        cardClassName: 'border-emerald-500/30 bg-emerald-500/5',
        description: 'Your stream is live. You can switch sources without ending the broadcast.',
        icon: Radio,
        iconClassName: 'text-emerald-500',
        title: 'Broadcast is live',
      };
    case 'switching':
      return {
        badgeLabel: 'Switching',
        badgeVariant: 'secondary' as const,
        cardClassName: 'border-amber-500/30 bg-amber-500/5',
        description: 'Choose a new window, tab, or display in the browser picker.',
        icon: LoaderCircle,
        iconClassName: 'animate-spin text-amber-500',
        title: 'Switching shared source',
      };
    default:
      return {
        badgeLabel: 'Ready',
        badgeVariant: 'outline' as const,
        cardClassName: '',
        description: 'Choose a channel and server, then start sharing your screen.',
        icon: CheckCircle2,
        iconClassName: 'text-primary',
        title: 'Ready to stream',
      };
  }
}

function getStreamKeyErrorDescription(message: string) {
  if (message.toLowerCase().includes('unauthorized')) {
    return 'You no longer have permission to stream to this channel. Try another channel or sign in again.';
  }

  if (message.toLowerCase().includes('not found')) {
    return 'This channel does not have a valid stream key yet. Regenerate it in channel settings, then retry.';
  }

  return 'Refresh the page and try again. If it keeps failing, check channel settings and server config.';
}

type ActionPanelProps = {
  actions?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: 'warning' | 'destructive';
};

type PublishState = 'idle' | 'connecting' | 'live' | 'switching';
