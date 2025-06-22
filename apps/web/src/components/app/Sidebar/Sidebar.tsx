'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { StreamInfoResponse, useStreams } from '@/lib/providers/StreamInfoProvider';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllChannels } from '@/lib/hooks/useUserList';

export default function Sidebar({ ...props }: React.ComponentProps<typeof UISidebar>) {
  const { channels: stream, isLoading } = useAllChannels(5000);
  const [followedExpanded, setFollowedExpanded] = React.useState(true);

  if (isLoading) return <SidebarSkeleton />;

  const liveStreamers = stream?.filter((s) => s.isLive) || [];
  const offlineStreamers = stream?.filter((s) => !s.isLive) || [];

  return (
    <UISidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <button
              onClick={() => setFollowedExpanded(!followedExpanded)}
              className="w-full flex items-center justify-between"
            >
              <span>Live Channels</span>
              {followedExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </SidebarGroupLabel>

          {followedExpanded && (
            <SidebarGroupContent>
              <SidebarMenu>
                {liveStreamers.map((streamer) => (
                  <StreamerItem key={streamer.id} streamer={streamer} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {offlineStreamers.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Offline Channels</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {offlineStreamers.map((streamer) => (
                  <StreamerItem key={streamer.id} streamer={streamer} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </UISidebar>
  );
}

function StreamerItem({ streamer }: { streamer: StreamInfoResponse[0] }) {
  const router = useRouter();
  return (
    <SidebarMenuItem key={streamer.id} className={streamer.isLive ? '' : '*:text-muted-foreground'}>
      <SidebarMenuButton className="flex items-center gap-3 h-full" onClick={() => {
        router.push(`/${streamer.username}`);
      }}>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={streamer.channel.pfpUrl} alt={streamer.username} />
            <AvatarFallback>{streamer.username}</AvatarFallback>
          </Avatar>
          {streamer.isLive && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-black" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium truncate">{streamer.username}</p>
          <p className="text-sm truncate">{streamer.category}</p>
          {streamer.isLive && (
            <p className="text-sm">
              {streamer.viewers} viewer{streamer.viewers === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarSkeleton({ ...props }: React.ComponentProps<typeof UISidebar>) {
  return (
    <UISidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <button className="w-full flex items-center justify-between">
              <span>Live Channels</span>
              <ChevronUp className="h-4 w-4" />
            </button>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {Array(3).fill(0).map((_, i) => (
                <StreamerItemSkeleton key={i} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Offline Channels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array(5).fill(0).map((_, i) => (
                <StreamerItemSkeleton key={i} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </UISidebar>
  );
}

function StreamerItemSkeleton() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="flex items-center gap-3 h-full">
        <div className="relative">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}