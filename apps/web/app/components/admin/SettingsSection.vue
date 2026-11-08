<script setup lang="ts">
import {
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  XCircle,
} from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import EmptyState from './EmptyState.vue';
import LoadingRows from './LoadingRows.vue';
import SectionHeader from './SectionHeader.vue';
import type { UserWithBan } from './types';

defineProps<{ users: UserWithBan[]; usersLoading: boolean; loggingOutOthers: boolean }>();
const search = defineModel<string>('search', { required: true });
const emit = defineEmits<{
  (e: 'toggleBypass', userId: string): void;
  (e: 'logoutOthers'): void;
}>();
</script>

<template>
  <div>
    <SectionHeader
      :icon="Settings"
      title="Platform Settings"
      description="Manage verification bypass and platform configuration."
    />

    <div class="space-y-5">
      <!-- Verification Bypass -->
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldAlert class="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 class="text-sm font-semibold">ID Verification Bypass</h3>
            <p class="text-xs text-muted-foreground">
              Allow existing users to bypass HCA verification and access the platform.
            </p>
          </div>
        </div>

        <div class="px-4 py-3">
          <div class="relative mb-3">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input v-model="search" placeholder="Search by email or username…" class="pl-10" />
          </div>

          <LoadingRows v-if="usersLoading" />
          <EmptyState v-else-if="!search" message="Search for users to manage verification bypass" />
          <EmptyState v-else-if="users.length === 0" message="No users found" />
          <div v-else class="space-y-1.5">
            <div
              v-for="user in users"
              :key="user.id"
              class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <Avatar class="h-8 w-8 shrink-0">
                <AvatarImage :src="user.pfpUrl" />
                <AvatarFallback class="text-xs">
                  {{ user.personalChannel?.name?.[0]?.toUpperCase() ?? 'U' }}
                </AvatarFallback>
              </Avatar>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-medium text-sm">
                    {{ user.personalChannel?.name ?? user.slack_id }}
                  </span>
                  <span
                    v-if="user.isAdmin"
                    class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    <Shield class="h-2.5 w-2.5" />
                    Admin
                  </span>
                  <span
                    v-if="user.bypassVerification"
                    class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    <CheckCircle2 class="h-2.5 w-2.5" />
                    Bypass
                  </span>
                </div>
                <p class="text-xs text-muted-foreground truncate">
                  {{ user.email ?? 'No email' }}
                </p>
              </div>

              <Button
                :variant="user.bypassVerification ? 'outline' : 'default'"
                size="sm"
                class="h-7 text-xs gap-1 shrink-0"
                @click="emit('toggleBypass', user.id)"
              >
                <template v-if="user.bypassVerification">
                  <XCircle class="h-3 w-3" />
                  Disable
                </template>
                <template v-else>
                  <CheckCircle2 class="h-3 w-3" />
                  Enable
                </template>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Management -->
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <LogOut class="h-4 w-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold">Session Management</h3>
            <p class="text-xs text-muted-foreground">
              Force logout all other active sessions for security maintenance.
            </p>
          </div>
        </div>

        <div class="px-4 py-3">
          <p class="text-xs text-muted-foreground mb-3">
            This will immediately sign out every other active session on hackclub.tv and keep only
            your current session active.
          </p>
          <Button
            variant="outline"
            size="sm"
            :disabled="loggingOutOthers"
            class="h-7 gap-1.5 text-xs"
            @click="emit('logoutOthers')"
          >
            <template v-if="loggingOutOthers">
              <RefreshCw class="h-3.5 w-3.5 animate-spin" />
              Logging out...
            </template>
            <template v-else>
              <LogOut class="h-3.5 w-3.5" />
              Logout All Other Sessions
            </template>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
