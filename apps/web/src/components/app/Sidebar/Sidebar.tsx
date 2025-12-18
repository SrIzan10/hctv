'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, Radio } from 'lucide-react';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { StreamInfoResponse, useStreams } from '@/lib/providers/StreamInfoProvider';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllChannels } from '@/lib/hooks/useUserList';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function Sidebar({ ...props }: React.ComponentProps<typeof UISidebar>) {
  const { channels: stream, isLoading } = useAllChannels(5000);
  const [followedExpanded, setFollowedExpanded] = React.useState(true);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isLoading) return <SidebarSkeleton {...props} />;

  const liveStreamers = stream?.filter((s) => s.isLive) || [];
  const offlineStreamers = stream?.filter((s) => !s.isLive) || [];

  return (
    <UISidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase text-muted-foreground group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200">
              Live Channels
            </span>
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200">
              {liveStreamers.length}
            </span>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {liveStreamers.length === 0 && !isCollapsed && (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No channels live
                </div>
              )}
              {liveStreamers.map((streamer) => (
                <StreamerItem key={streamer.id} streamer={streamer} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="group-data-[collapsible=icon]:block hidden" />
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase text-muted-foreground group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200">
              Offline Channels
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {offlineStreamers.map((streamer) => (
                <StreamerItem key={streamer.id} streamer={streamer} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </UISidebar>
  );
}

function StreamerItem({ streamer, isCollapsed }: { streamer: StreamInfoResponse[0], isCollapsed: boolean }) {
  const router = useRouter();
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={streamer.username}
        className="h-12"
        onClick={() => router.push(`/${streamer.username}`)}
      >
        <button className="flex w-full items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={streamer.channel.pfpUrl} alt={streamer.username} className="object-cover" />
              <AvatarFallback>{streamer.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {streamer.isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-2 ring-background">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              </span>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-1 flex-col items-start overflow-hidden">
              <div className="flex w-full items-center justify-between">
                <span className="truncate font-medium text-sm leading-none">
                  {streamer.username}
                </span>
                {streamer.isLive && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>{streamer.viewers}</span>
                  </div>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground w-full text-left">
                {streamer.isLive ? streamer.title || streamer.category || 'Live' : 'Offline'}
              </span>
            </div>
          )}
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarSkeleton({ ...props }: React.ComponentProps<typeof UISidebar>) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <UISidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-1.5">
            <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array(3).fill(0).map((_, i) => (
                <StreamerItemSkeleton key={i} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="group-data-[collapsible=icon]:block hidden" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-1.5">
            <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array(5).fill(0).map((_, i) => (
                <StreamerItemSkeleton key={i} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </UISidebar>
  );
}

function StreamerItemSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="h-12">
        <div className="flex w-full items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}