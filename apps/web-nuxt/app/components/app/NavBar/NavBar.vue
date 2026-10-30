<script setup lang="ts">
import {
  IdCard,
  Shield,
  Settings,
  Users,
  PenSquare,
  LogOut,
  Code,
  Radio,
  FolderGit2,
} from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { callAction } from '~/lib/actions';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher.vue';

const { user } = useUser();
const { channels: personalChannels } = usePersonalChannels();
const config = useRuntimeConfig();
const isDev = import.meta.dev;

const personalChannel = computed(() =>
  personalChannels.value.find((channel) => channel.channelId === user.value?.personalChannelId)
);
const username = computed(() => personalChannel.value?.username || 'not-onboarded');

const menuItemClass = 'cursor-pointer rounded-lg px-2.5 py-2 text-sm';
const iconClass = 'w-4 h-4 mr-1 text-muted-foreground';

async function logout() {
  await callAction('logout');
}
</script>

<template>
  <nav
    class="flex items-center justify-between h-14 md:h-16 px-2 md:px-4 border-b gap-1 md:gap-3 w-full z-40 fixed top-0 left-0 bg-mantle"
  >
    <div class="flex items-center gap-1 md:gap-2 shrink-0">
      <SidebarTrigger />
      <NuxtLink to="/" class="flex items-center gap-2 rounded-full px-1.5 py-1">
        <NuxtImg src="/logo.webp" alt="" class="h-7 w-7 rounded-md md:h-8 md:w-8" />
        <span class="hidden text-base font-bold sm:inline">hackclub.tv</span>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2 md:gap-3 shrink-0">
      <NuxtLink v-if="user" to="/stream">
        <Button size="sm" class="bg-live text-live-foreground hover:bg-live/90">
          <Radio />
          Go live
        </Button>
      </NuxtLink>

      <DropdownMenu v-if="user">
        <DropdownMenuTrigger
          class="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar class="h-8 w-8 md:h-9 md:w-9">
            <AvatarImage :src="user.pfpUrl" :alt="`@${username}`" />
            <AvatarFallback>{{ username[0]?.toUpperCase() }}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-64 mt-2 p-1.5 rounded-xl" align="end" :side-offset="5">
          <div class="flex items-center gap-3 p-2">
            <Avatar class="h-9 w-9">
              <AvatarImage :src="user.pfpUrl" :alt="`@${username}`" />
              <AvatarFallback>{{ username[0]?.toUpperCase() }}</AvatarFallback>
            </Avatar>
            <NuxtLink
              :to="`/${username}`"
              class="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
            >
              @{{ username }}
            </NuxtLink>
          </div>
          <DropdownMenuSeparator class="mb-1" />

          <DropdownMenuGroup>
            <NuxtLink to="/settings/follows">
              <DropdownMenuItem :class="menuItemClass">
                <Users :class="iconClass" />
                Follows
              </DropdownMenuItem>
            </NuxtLink>
            <NuxtLink to="/settings/channel/create">
              <DropdownMenuItem :class="menuItemClass">
                <PenSquare :class="iconClass" />
                Create channel
              </DropdownMenuItem>
            </NuxtLink>
            <NuxtLink to="/settings/bot">
              <DropdownMenuItem :class="menuItemClass">
                <Settings :class="iconClass" />
                Bot accounts
              </DropdownMenuItem>
            </NuxtLink>

            <div v-if="user.isAdmin">
              <DropdownMenuSeparator class="my-1" />
              <NuxtLink to="/admin">
                <DropdownMenuItem :class="menuItemClass">
                  <Shield :class="iconClass" />
                  Admin Panel
                </DropdownMenuItem>
              </NuxtLink>
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator class="my-1" />

          <DropdownMenuGroup>
            <a href="https://docs.hackclub.tv" target="_blank" rel="noreferrer">
              <DropdownMenuItem :class="menuItemClass">
                <Code :class="iconClass" />
                API Docs
              </DropdownMenuItem>
            </a>
            <a href="https://github.com/SrIzan10/hctv" target="_blank" rel="noreferrer">
              <DropdownMenuItem :class="menuItemClass">
                <FolderGit2 :class="iconClass" />
                Source code
              </DropdownMenuItem>
            </a>
          </DropdownMenuGroup>

          <DropdownMenuSeparator class="my-1" />

          <div class="flex items-center justify-between px-1">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground hover:text-foreground"
              @click="logout"
            >
              <LogOut class="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <div class="mt-1.5 pt-2 pb-1 border-t border-border px-2">
            <p class="text-[11px] text-muted-foreground/70 text-center tabular-nums">
              v{{ config.public.version }}-{{ isDev ? 'dev' : 'prod' }} •
              <a
                :href="`https://github.com/SrIzan10/hctv/commit/${config.public.commit}`"
                target="_blank"
                class="hover:text-primary underline decoration-border/50 underline-offset-2"
              >
                {{ String(config.public.commit || '').substring(0, 7) || 'unknown' }}
              </a>
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <a v-else href="/auth/hackclub">
        <Button size="sm">
          <IdCard />
          Sign in
        </Button>
      </a>
    </div>
  </nav>
</template>
