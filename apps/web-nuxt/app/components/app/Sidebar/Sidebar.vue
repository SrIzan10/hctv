<script setup lang="ts">
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import StreamerItem from './StreamerItem.vue';

// extra classes (e.g. the layout's `pt-14 md:pt-16`) fall through to the UI sidebar
defineOptions({ inheritAttrs: false });

const { channels: stream, isLoading } = useAllChannels(5000);
const { state } = useSidebar();
const isCollapsed = computed(() => state.value === 'collapsed');

const alwaysOnStreamers = computed(() =>
  stream.value.filter((s) => s.isLive && s.channel.is247)
);
const liveStreamers = computed(() => stream.value.filter((s) => s.isLive && !s.channel.is247));
const offlineStreamers = computed(() => stream.value.filter((s) => !s.isLive));

const labelClass =
  'text-xs font-semibold uppercase text-muted-foreground group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200';
const countClass =
  'text-xs text-muted-foreground group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200';
</script>

<template>
  <UISidebar v-if="isLoading" collapsible="icon" v-bind="$attrs">
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel class="px-2 py-1.5">
          <Skeleton
            class="h-4 w-24 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200"
          />
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="i in 3" :key="i">
              <SidebarMenuButton class="h-12">
                <div class="flex w-full items-center gap-3">
                  <Skeleton class="h-8 w-8 rounded-full flex-shrink-0" />
                  <div v-if="!isCollapsed" class="flex-1 space-y-1.5">
                    <Skeleton class="h-3.5 w-24" />
                    <Skeleton class="h-3 w-16" />
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator class="group-data-[collapsible=icon]:block hidden" />

      <SidebarGroup>
        <SidebarGroupLabel class="px-2 py-1.5">
          <Skeleton
            class="h-4 w-24 group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200"
          />
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="i in 5" :key="i">
              <SidebarMenuButton class="h-12">
                <div class="flex w-full items-center gap-3">
                  <Skeleton class="h-8 w-8 rounded-full flex-shrink-0" />
                  <div v-if="!isCollapsed" class="flex-1 space-y-1.5">
                    <Skeleton class="h-3.5 w-24" />
                    <Skeleton class="h-3 w-16" />
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </UISidebar>

  <UISidebar v-else collapsible="icon" v-bind="$attrs">
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel class="flex items-center justify-between px-2 py-1.5">
          <span :class="labelClass">Live Channels</span>
          <span :class="countClass">{{ liveStreamers.length }}</span>
        </SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu>
            <div
              v-if="liveStreamers.length === 0 && !isCollapsed"
              class="px-4 py-2 text-sm text-muted-foreground"
            >
              No channels live
            </div>
            <StreamerItem
              v-for="streamer in liveStreamers"
              :key="streamer.id"
              :streamer="streamer"
              :is-collapsed="isCollapsed"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator class="group-data-[collapsible=icon]:block hidden" />

      <SidebarGroup>
        <SidebarGroupLabel class="flex items-center justify-between px-2 py-1.5">
          <span :class="labelClass">24/7 Channels</span>
          <span :class="countClass">{{ alwaysOnStreamers.length }}</span>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <div
              v-if="alwaysOnStreamers.length === 0 && !isCollapsed"
              class="px-4 py-2 text-sm text-muted-foreground"
            >
              No 24/7 channels
            </div>
            <StreamerItem
              v-for="streamer in alwaysOnStreamers"
              :key="streamer.id"
              :streamer="streamer"
              :is-collapsed="isCollapsed"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator class="group-data-[collapsible=icon]:block hidden" />

      <SidebarGroup>
        <SidebarGroupLabel class="flex items-center justify-between px-2 py-1.5">
          <span :class="labelClass">Offline Channels</span>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <StreamerItem
              v-for="streamer in offlineStreamers"
              :key="streamer.id"
              :streamer="streamer"
              :is-collapsed="isCollapsed"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </UISidebar>
</template>
