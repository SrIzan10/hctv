'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CircleAlert,
  Globe,
  LoaderCircle,
  Monitor,
  Radio,
  RefreshCw,
  Square,
  Video,
} from 'lucide-react';
import { ChannelSelect } from '@/components/app/ChannelSelect/ChannelSelect';
import { cn } from '@/lib/utils';
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
    hasPreview,
    issue,
    isLive,
    isPreviewReady,
    isPreviewingSource,
    isSessionActive,
    isStarting,
    isSwitchingSource,
    previewRef,
    previewSource,
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
    !isSessionActive &&
    !isPreviewingSource &&
    Boolean(selectedChannel) &&
    Boolean(streamKey) &&
    !isLoadingStreamKey;
  const channelPlaceholder = isLoadingChannels ? 'Loading channels...' : 'Select a channel';
  const primaryIssue = issue ?? browserWarning;

  useEffect(() => {
    if (isSessionActive) {
      return;
    }

    if (!ownedChannels.some((channel) => channel.name === selectedChannel)) {
      setSelectedChannel(ownedChannels[0]?.name ?? '');
    }
  }, [isSessionActive, ownedChannels, selectedChannel]);

  const statusLabel = isLive
    ? 'LIVE'
    : isSwitchingSource
      ? 'Switching'
      : isStarting
        ? 'Connecting'
        : isPreviewingSource
          ? hasPreview
            ? 'Updating Preview'
            : 'Preparing Preview'
          : isPreviewReady
            ? 'Preview'
            : 'Ready';

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Video Stage */}
      <div className="flex flex-1 items-center justify-center px-4 py-4 md:px-6">
        <div className="w-full max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-black shadow-2xl">
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={previewRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-contain"
              />

              {!hasPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-muted-foreground">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-secondary bg-secondary/80">
                    <Monitor className="h-10 w-10 text-primary/80" />
                  </div>
                  <div className="max-w-md text-center space-y-1.5">
                    <p className="text-lg font-medium text-zinc-200">
                      Ready to livestream
                    </p>
                    <p className="text-sm text-zinc-400">
                      Select a tab, window, or display to preview.
                    </p>
                  </div>
                </div>
              )}

              {(isPreviewingSource || isStarting || isSwitchingSource) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white backdrop-blur-sm">
                  <LoaderCircle className="h-8 w-8 animate-spin" />
                  <p className="text-sm font-medium">
                    {isPreviewingSource
                      ? hasPreview
                        ? 'Updating preview...'
                        : 'Preparing preview...'
                      : isStarting
                        ? 'Starting broadcast...'
                        : 'Switching source...'}
                  </p>
                </div>
              )}

              <div className="absolute left-6 top-6">
                <Badge
                  variant={isLive ? 'default' : hasPreview ? 'secondary' : 'outline'}
                  className={cn(
                    'gap-2 px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md transition-all',
                    isLive && 'bg-red-500 text-white hover:bg-red-600',
                    !isLive && !hasPreview && 'border-zinc-800 bg-black/50 text-zinc-400'
                  )}
                >
                  {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(streamKeyError || primaryIssue) && (
        <div className="absolute inset-x-0 top-4 z-10 mx-auto max-w-xl px-4 md:top-6">
          {streamKeyError ? (
            <AlertCard
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
            <AlertCard
              actions={
                <div className="flex flex-wrap gap-2">
                  {!isSessionActive && primaryIssue.context === 'preview' ? (
                    <Button
                      onClick={previewSource}
                      disabled={isPreviewingSource}
                      loading={isPreviewingSource}
                      size="sm"
                    >
                      Preview again
                    </Button>
                  ) : null}

                  {!isSessionActive &&
                  primaryIssue.context !== 'warning' &&
                  primaryIssue.context !== 'preview' ? (
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
                </div>
              }
              description={primaryIssue.description}
              icon={primaryIssue.tone === 'warning' ? AlertTriangle : CircleAlert}
              title={primaryIssue.title}
              tone={primaryIssue.tone}
            />
          ) : null}
        </div>
      )}

      <div className="shrink-0 border-t border-border/50 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3">
              <Video className="h-4 w-4 text-muted-foreground" />
              <ChannelSelect
                channelList={ownedChannels}
                disabled={isSessionActive || isLoadingChannels || !hasChannels}
                placeholder={channelPlaceholder}
                value={selectedChannel || undefined}
                onSelect={setSelectedChannel}
                triggerClassName="w-48"
              />
            </div>

            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedRegion}
                onValueChange={(value) => setSelectedRegion(value as MediaMTXRegion)}
                disabled={isSessionActive || !hasServerOptions}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {serverOptions.map((server) => (
                    <SelectItem
                      key={server.value}
                      value={server.value}
                      disabled={!server.whipEnabled}
                    >
                      {server.label} {server.emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!hasChannels && !isLoadingChannels ? (
              <p className="text-xs text-muted-foreground">Create a channel to stream.</p>
            ) : null}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isSessionActive ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={previewSource}
                  disabled={isPreviewingSource}
                  loading={isPreviewingSource}
                  size="default"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  {hasPreview ? 'Change Preview' : 'Preview'}
                </Button>

                {hasPreview ? (
                  <Button
                    onClick={stopPublishing}
                    disabled={isPreviewingSource}
                    variant="outline"
                    size="default"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Clear Preview
                  </Button>
                ) : null}

                <Button
                  onClick={startPublishing}
                  disabled={!canStartPublishing || isSwitchingSource}
                  loading={isStarting}
                  size="default"
                >
                  <Radio className="mr-2 h-4 w-4" />
                  Start
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={changeSource}
                  disabled={!isLive}
                  loading={isSwitchingSource}
                  size="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Switch
                </Button>

                <Button
                  onClick={stopPublishing}
                  disabled={isPreviewingSource || isSwitchingSource}
                  variant="outline"
                  size="default"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ actions, description, icon: Icon, title, tone }: AlertCardProps) {
  const isWarning = tone === 'warning';

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 shadow-xl backdrop-blur-md',
        isWarning
          ? 'border-l-amber-500 bg-amber-500/[0.03]'
          : 'border-l-destructive bg-destructive/[0.03]'
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              isWarning ? 'text-amber-500' : 'text-destructive'
            )}
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 md:shrink-0">{actions}</div> : null}
      </CardContent>
    </Card>
  );
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

type AlertCardProps = {
  actions?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: 'warning' | 'destructive';
};
