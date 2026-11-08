<script setup lang="ts">
import { ArrowRight, ClipboardList, Hash, MessageSquare, RefreshCw, Shield, ShieldAlert } from '@lucide/vue';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import EmptyState from './EmptyState.vue';
import LoadingRows from './LoadingRows.vue';
import SectionHeader from './SectionHeader.vue';
import { AUDIT_ACTION_COLOR, AUDIT_SOURCE_DOT } from './types';
import type { AuditLog } from './types';

defineProps<{ logs: AuditLog[]; loading: boolean }>();
const emit = defineEmits<{ (e: 'refresh'): void }>();
</script>

<template>
  <div>
    <SectionHeader
      :icon="ClipboardList"
      title="Audit Log"
      description="Platform-wide moderation and admin actions across all admins."
    >
      <template #action>
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs gap-1.5 shrink-0"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-3 w-3" />
          Refresh
        </Button>
      </template>
    </SectionHeader>

    <!-- Legend -->
    <div class="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
      <span class="flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-primary inline-block" />
        Platform
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-amber-500 inline-block" />
        Chat
      </span>
    </div>

    <LoadingRows v-if="loading" />
    <EmptyState v-else-if="logs.length === 0" message="No audit events yet" />
    <div v-else class="relative">
      <!-- Timeline spine -->
      <div class="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      <div class="space-y-0">
        <div v-for="(log, idx) in logs" :key="`${log.source}-${log.id}`" class="flex gap-4 group">
          <!-- Dot on spine -->
          <div class="flex flex-col items-center pt-3 shrink-0">
            <div
              :class="
                cn(
                  'h-3.5 w-3.5 rounded-full border-2 border-background z-10 shrink-0',
                  AUDIT_SOURCE_DOT[log.source] ?? 'bg-muted-foreground'
                )
              "
            />
          </div>

          <!-- Event card -->
          <div
            :class="
              cn(
                'flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2.5 mb-1 transition-colors group-hover:bg-muted/30 group-hover:border-border',
                idx === logs.length - 1 && 'mb-0'
              )
            "
          >
            <div class="flex items-start justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <span
                  :class="
                    cn(
                      'text-xs font-mono font-semibold',
                      AUDIT_ACTION_COLOR[log.action] ?? 'text-foreground'
                    )
                  "
                >
                  {{ log.action }}
                </span>

                <span class="text-xs text-muted-foreground">
                  by
                  <span class="font-medium text-foreground">{{ log.actor }}</span>
                </span>
                <TooltipProvider v-if="log.actorMeta?.isChannelModerator">
                  <Tooltip :delay-duration="200">
                    <TooltipTrigger as-child>
                      <Shield class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Channel Mod</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider v-if="log.actorMeta?.isPlatformAdmin">
                  <Tooltip :delay-duration="200">
                    <TooltipTrigger as-child>
                      <ShieldAlert class="h-3.5 w-3.5 text-destructive shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Platform Admin</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <template v-if="log.target">
                  <ArrowRight class="h-3 w-3 text-muted-foreground shrink-0" />
                  <span class="text-xs font-medium">{{ log.target }}</span>
                  <TooltipProvider v-if="log.targetMeta?.isChannelModerator">
                    <Tooltip :delay-duration="200">
                      <TooltipTrigger as-child>
                        <Shield class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Channel Mod</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider v-if="log.targetMeta?.isPlatformAdmin">
                    <Tooltip :delay-duration="200">
                      <TooltipTrigger as-child>
                        <ShieldAlert class="h-3.5 w-3.5 text-destructive shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Platform Admin</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </template>

                <span
                  v-if="log.channelName"
                  class="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <Hash class="h-3 w-3" />
                  {{ log.channelName }}
                </span>
              </div>

              <!-- Time -->
              <ClientOnly>
                <time
                  class="text-[11px] text-muted-foreground shrink-0 tabular-nums"
                  :title="format(new Date(log.createdAt), 'PPP p')"
                >
                  {{ formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) }}
                </time>
              </ClientOnly>
            </div>

            <p v-if="log.reason" class="text-[11px] text-muted-foreground mt-1 leading-snug">
              {{ log.reason }}
            </p>

            <div
              v-if="log.deletedMessageContent"
              class="mt-2 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <MessageSquare class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div class="min-w-0">
                <p
                  class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Deleted message
                </p>
                <p class="mt-1 break-words text-xs leading-relaxed text-foreground/90">
                  {{ log.deletedMessageContent }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
