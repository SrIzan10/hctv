<script setup lang="ts">
import {
  IdCard,
  Shield,
  Settings,
  Users,
  PenSquare,
  LogOut,
  Code,
  Heart,
  Radio,
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

const menuItemClass =
  'cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary';
const iconClass = 'w-4 h-4 mr-3 text-muted-foreground';

async function logout() {
  await callAction('logout');
}
</script>

<template>
  <nav
    class="flex items-center justify-between h-14 md:h-16 px-2 md:px-4 border-b gap-1 md:gap-3 w-full z-40 fixed top-0 left-0 shadow-md bg-mantle"
  >
    <div class="flex items-center space-x-2 md:space-x-5 shrink-0">
      <NuxtLink to="/" class="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          class="rounded-sm hover:scale-105 transition-transform duration-200"
        >
          <NuxtImg src="/logo.webp" alt="HCTV Logo" class="h-6 w-6 md:h-8 md:w-8" />
        </Button>
      </NuxtLink>
      <SidebarTrigger />
    </div>

    <!-- Right Side Items -->
    <div class="flex items-center gap-1 md:gap-3 shrink-0">
      <NuxtLink v-if="user" to="/stream">
        <Button variant="outline" size="sm" class="gap-1 md:gap-2 text-xs md:text-sm">
          <Radio class="w-3 h-3 md:w-4 md:h-4" />
          <span class="hidden sm:inline">Go live</span>
          <span class="sm:hidden">Live</span>
        </Button>
      </NuxtLink>

      <div v-if="$slots.editLivestream" class="hidden sm:block">
        <slot name="editLivestream" />
      </div>

      <DropdownMenu v-if="user">
        <DropdownMenuTrigger as-child class="cursor-pointer">
          <Avatar class="h-8 w-8 md:h-10 md:w-10">
            <AvatarImage :src="user.pfpUrl" :alt="`@${username || '(not onboarded)'}`" />
            <AvatarFallback>{{ user.pfpUrl }}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-64 mt-2 p-2 rounded-xl border-border/50 shadow-xl backdrop-blur-xl bg-mantle/95"
          align="end"
          :side-offset="5"
        >
          <div class="flex items-center gap-3 p-2 mb-2">
            <Avatar class="h-10 w-10 border border-border/50">
              <AvatarImage :src="user.pfpUrl" :alt="`@${username}`" />
              <AvatarFallback>{{ username[0]?.toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="flex flex-col space-y-0.5">
              <p class="text-sm font-semibold tracking-tight text-foreground">@{{ username }}</p>
              <p class="text-xs text-muted-foreground truncate max-w-[140px]">
                Manage your account
              </p>
            </div>
          </div>
          <DropdownMenuSeparator class="bg-border/40 mb-2" />

          <DropdownMenuGroup class="space-y-1">
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
              <DropdownMenuSeparator class="bg-border/40 my-2" />
              <NuxtLink to="/admin">
                <DropdownMenuItem :class="`${menuItemClass} text-primary hover:text-primary`">
                  <Shield class="w-4 h-4 mr-3 text-primary" />
                  Admin Panel
                </DropdownMenuItem>
              </NuxtLink>
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator class="bg-border/40 my-2" />

          <DropdownMenuGroup class="space-y-1">
            <a href="https://docs.hackclub.tv" target="_blank" rel="noreferrer">
              <DropdownMenuItem :class="menuItemClass">
                <Code :class="iconClass" />
                API Docs
              </DropdownMenuItem>
            </a>
            <div class="grid grid-cols-2 gap-1">
              <a href="https://github.com/SrIzan10/hctv" target="_blank" rel="noreferrer">
                <DropdownMenuItem :class="`${menuItemClass} justify-center text-xs gap-2`">
                  <NuxtImg
                    src="https://thesvg.org/icons/github/dark.svg"
                    alt="GitHub"
                    width="14"
                    height="14"
                  />
                  Github
                </DropdownMenuItem>
              </a>
              <a href="https://github.com/sponsors/SrIzan10" target="_blank" rel="noreferrer">
                <DropdownMenuItem
                  :class="`${menuItemClass} justify-center text-xs text-pink-500 hover:text-pink-500 hover:bg-pink-500/10 focus:bg-pink-500/10`"
                >
                  <Heart class="w-3.5 h-3.5 mr-1.5" />
                  Sponsor
                </DropdownMenuItem>
              </a>
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator class="bg-border/40 my-2" />

          <div class="flex items-center justify-between px-1">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              class="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
              @click="logout"
            >
              <LogOut class="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <div class="mt-2 pt-3 border-t border-border/40 px-2">
            <p class="text-[10px] text-muted-foreground/60 text-center font-mono">
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
        <Button variant="outline" size="sm" class="gap-1 md:gap-2 text-xs md:text-sm">
          <IdCard class="w-3 h-3 md:w-4 md:h-4" />
          <span class="hidden sm:inline">Sign in</span>
          <span class="sm:hidden">Login</span>
        </Button>
      </a>
    </div>
  </nav>
</template>
