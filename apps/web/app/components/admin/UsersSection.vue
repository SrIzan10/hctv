<script setup lang="ts">
import { Ban, Search, Shield, ShieldCheck, ShieldMinus, ShieldOff, Users } from '@lucide/vue';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import EmptyState from './EmptyState.vue';
import LoadingRows from './LoadingRows.vue';
import SectionHeader from './SectionHeader.vue';
import type { UserWithBan } from './types';

defineProps<{ users: UserWithBan[]; loading: boolean; currentUserId: string }>();
const search = defineModel<string>('search', { required: true });
const emit = defineEmits<{
  (e: 'ban', user: UserWithBan): void;
  (e: 'unban', userId: string): void;
  (e: 'promote', userId: string): void;
  (e: 'demote', userId: string): void;
}>();
</script>

<template>
  <div>
    <SectionHeader
      :icon="Users"
      title="User Management"
      description="Search and manage user accounts."
    />

    <div class="relative mb-4">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
      />
      <Input v-model="search" placeholder="Search by username or email…" class="pl-10" />
    </div>

    <LoadingRows v-if="loading" />
    <EmptyState v-else-if="users.length === 0" message="No users found" />
    <div v-else class="space-y-2">
      <div
        v-for="user in users"
        :key="user.id"
        class="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
      >
        <Avatar class="h-9 w-9 shrink-0">
          <AvatarImage :src="user.pfpUrl" />
          <AvatarFallback class="text-xs">
            {{ user.personalChannel?.name?.[0]?.toUpperCase() ?? 'U' }}
          </AvatarFallback>
        </Avatar>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm">
              {{ user.personalChannel?.name ?? user.slack_id }}
            </span>
            <span
              v-if="user.isAdmin"
              class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              <Shield class="h-2.5 w-2.5" />
              Admin
            </span>
            <span
              v-if="user.ban"
              class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
            >
              <Ban class="h-2.5 w-2.5" />
              Banned
            </span>
          </div>
          <p class="text-xs text-muted-foreground truncate">
            {{ user.email ?? user.slack_id }}
          </p>
          <p v-if="user.ban" class="text-xs text-muted-foreground mt-0.5">
            Ban reason: {{ user.ban.reason
            }}{{
              user.ban.expiresAt ? ` · Expires ${format(new Date(user.ban.expiresAt), 'PP')}` : ''
            }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <template v-if="user.isAdmin">
            <Button
              v-if="user.id !== currentUserId"
              variant="outline"
              size="sm"
              class="h-7 text-xs gap-1"
              @click="emit('demote', user.id)"
            >
              <ShieldMinus class="h-3 w-3" />
              Demote
            </Button>
          </template>
          <template v-else>
            <Button
              v-if="user.ban"
              variant="outline"
              size="sm"
              class="h-7 text-xs gap-1"
              @click="emit('unban', user.id)"
            >
              <ShieldOff class="h-3 w-3" />
              Unban
            </Button>
            <Button
              v-else
              variant="destructive"
              size="sm"
              class="h-7 text-xs gap-1"
              @click="emit('ban', user)"
            >
              <Ban class="h-3 w-3" />
              Ban
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-7 text-xs gap-1"
              @click="emit('promote', user.id)"
            >
              <ShieldCheck class="h-3 w-3" />
              Promote
            </Button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
