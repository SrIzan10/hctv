<script setup lang="ts">
import { ArrowRight, ExternalLink, Flag, Hash, MessageSquare, RefreshCw } from '@lucide/vue';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import EmptyState from './EmptyState.vue';
import LoadingRows from './LoadingRows.vue';
import SectionHeader from './SectionHeader.vue';
import { LAST_ACTION_LABELS, REPORT_STATUS_CONFIG } from './types';
import type { ChatReport } from './types';

defineProps<{
  reports: ChatReport[];
  loading: boolean;
  highlightReportId: string | null;
}>();
const emit = defineEmits<{ (e: 'refresh'): void }>();

const STATUSES = ['OPEN', 'REVIEWED', 'DISMISSED'] as const;
</script>

<template>
  <div>
    <SectionHeader
      :icon="Flag"
      title="Chat Reports"
      description="User-submitted chat reports requiring review."
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

    <!-- Status filter summary -->
    <div v-if="reports.length > 0" class="flex items-center gap-2 mb-4 flex-wrap">
      <template v-for="status in STATUSES" :key="status">
        <span
          v-if="reports.filter((r) => r.status === status).length"
          :class="
            cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
              REPORT_STATUS_CONFIG[status].class
            )
          "
        >
          <component :is="REPORT_STATUS_CONFIG[status].icon" class="h-3 w-3" />
          {{ reports.filter((r) => r.status === status).length }}
          {{ REPORT_STATUS_CONFIG[status].label }}
        </span>
      </template>
    </div>

    <LoadingRows v-if="loading" />
    <EmptyState v-else-if="reports.length === 0" message="No reports yet" />
    <div v-else class="space-y-3">
      <div
        v-for="report in reports"
        :id="`report-card-${report.id}`"
        :key="report.id"
        :class="
          cn(
            'rounded-xl border bg-card overflow-hidden transition-all',
            highlightReportId === report.id
              ? 'border-primary ring-2 ring-primary/20 shadow-sm shadow-primary/10'
              : 'border-border hover:border-muted-foreground/30'
          )
        "
      >
        <!-- Card top bar -->
        <div
          class="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/20"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              :class="
                cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                  REPORT_STATUS_CONFIG[report.status].class
                )
              "
            >
              <component :is="REPORT_STATUS_CONFIG[report.status].icon" class="h-3 w-3" />
              {{ REPORT_STATUS_CONFIG[report.status].label }}
            </span>

            <span class="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash class="h-3 w-3" />
              {{ report.channelName }}
            </span>

            <span class="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <span class="font-medium text-foreground">{{ report.reporter }}</span>
              <ArrowRight class="h-3 w-3" />
              <span class="font-medium text-foreground">{{ report.target }}</span>
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <ClientOnly>
              <time class="text-[11px] text-muted-foreground tabular-nums hidden md:block">
                {{ formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) }}
              </time>
            </ClientOnly>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-xs gap-1 px-2"
              @click="navigateTo(`/admin/reports/${report.id}`)"
            >
              Open case
              <ExternalLink class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <!-- Card body -->
        <div class="px-4 py-3 space-y-2">
          <p class="text-sm">{{ report.reason }}</p>

          <div
            v-if="report.reportedMessage"
            class="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2"
          >
            <MessageSquare class="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p class="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {{ report.reportedMessage }}
            </p>
          </div>

          <div
            v-if="report.lastAction || report.handledBy"
            class="flex items-center gap-3 pt-1 text-xs text-muted-foreground flex-wrap"
          >
            <span v-if="report.lastAction" class="flex items-center gap-1">
              Last action:
              <span class="font-medium text-foreground">
                {{ LAST_ACTION_LABELS[report.lastAction] ?? report.lastAction }}
              </span>
            </span>
            <span v-if="report.handledBy" class="flex items-center gap-1">
              Handled by:
              <span class="font-medium text-foreground">{{ report.handledBy }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
