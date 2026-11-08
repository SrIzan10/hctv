<script setup lang="ts">
import { Ban, Search, ShieldOff, Tv } from '@lucide/vue';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import EmptyState from './EmptyState.vue';
import LoadingRows from './LoadingRows.vue';
import SectionHeader from './SectionHeader.vue';
import type { ChannelWithRestriction } from './types';

defineProps<{ channels: ChannelWithRestriction[]; loading: boolean }>();
const search = defineModel<string>('search', { required: true });
const emit = defineEmits<{
  (e: 'restrict', channel: ChannelWithRestriction): void;
  (e: 'unrestrict', channelId: string): void;
}>();
</script>

<template>
  <div>
    <SectionHeader
      :icon="Tv"
      title="Channel Management"
      description="Search and restrict channels from streaming."
    />

    <div class="relative mb-4">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
      />
      <Input v-model="search" placeholder="Search by channel name…" class="pl-10" />
    </div>

    <LoadingRows v-if="loading" />
    <EmptyState v-else-if="channels.length === 0" message="No channels found" />
    <div v-else class="space-y-2">
      <div
        v-for="channel in channels"
        :key="channel.id"
        class="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
      >
        <Avatar class="h-9 w-9 shrink-0">
          <AvatarImage :src="channel.pfpUrl" />
          <AvatarFallback class="text-xs">{{ channel.name[0]?.toUpperCase() }}</AvatarFallback>
        </Avatar>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm">{{ channel.name }}</span>
            <span
              v-if="channel.personalFor"
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
            >
              Personal
            </span>
            <span
              v-if="channel.restriction"
              class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
            >
              <Ban class="h-2.5 w-2.5" />
              Restricted
            </span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <Avatar class="h-4 w-4">
              <AvatarImage :src="channel.owner.pfpUrl" />
              <AvatarFallback class="text-[8px]">O</AvatarFallback>
            </Avatar>
            <span class="text-xs text-muted-foreground">
              {{ channel.owner.personalChannel.name }}
            </span>
          </div>
          <p v-if="channel.restriction" class="text-xs text-muted-foreground mt-0.5">
            Reason: {{ channel.restriction.reason
            }}{{
              channel.restriction.expiresAt
                ? ` · Expires ${format(new Date(channel.restriction.expiresAt), 'PP')}`
                : ''
            }}
          </p>
        </div>
        <div class="shrink-0">
          <Button
            v-if="channel.restriction"
            variant="outline"
            size="sm"
            class="h-7 text-xs gap-1"
            @click="emit('unrestrict', channel.id)"
          >
            <ShieldOff class="h-3 w-3" />
            Unrestrict
          </Button>
          <Button
            v-else
            variant="destructive"
            size="sm"
            class="h-7 text-xs gap-1"
            @click="emit('restrict', channel)"
          >
            <Ban class="h-3 w-3" />
            Restrict
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
