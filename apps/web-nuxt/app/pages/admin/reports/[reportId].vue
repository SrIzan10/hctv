<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'vue-sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Gavel,
  Info,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Timer,
  Trash2,
  Unlock,
  User,
  XCircle,
} from '@lucide/vue';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';

definePageMeta({ middleware: 'protected' });

type ReportModerationAction =
  | 'review'
  | 'dismiss'
  | 'delete_reported_message'
  | 'timeout_10m'
  | 'timeout_1h'
  | 'ban_chat'
  | 'lift_chat_ban'
  | 'ban_platform'
  | 'unban_platform';

type ActionSeverity = 'info' | 'moderate' | 'severe';

interface ActionOption {
  value: ReportModerationAction;
  label: string;
  description: string;
  severity: ActionSeverity;
  requiresNote?: boolean;
  icon: Component;
}

interface ChatReportCase {
  id: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  reason: string;
  reportedMessage: string | null;
  reportedMessageId: string | null;
  targetUsername: string | null;
  channelName: string;
  createdAt: string;
  handledAt: string | null;
  handlingNote: string | null;
  lastAction:
    | 'REVIEW'
    | 'DISMISS'
    | 'DELETE_REPORTED_MESSAGE'
    | 'TIMEOUT_10M'
    | 'TIMEOUT_1H'
    | 'BAN_CHAT'
    | 'LIFT_CHAT_BAN'
    | 'BAN_PLATFORM'
    | 'UNBAN_PLATFORM'
    | null;
  reporter: string;
  target: string;
  targetUserId: string | null;
  targetIsAdmin: boolean;
  targetIsPlatformBanned: boolean;
  handledBy: string | null;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'review',
    label: 'Mark as reviewed',
    description: 'Acknowledge the report without further action.',
    severity: 'info',
    icon: CheckCircle2,
  },
  {
    value: 'dismiss',
    label: 'Dismiss',
    description: 'Close this report as unfounded or resolved.',
    severity: 'info',
    icon: XCircle,
  },
  {
    value: 'delete_reported_message',
    label: 'Delete message',
    description: 'Remove the reported message from the chat.',
    severity: 'moderate',
    requiresNote: true,
    icon: Trash2,
  },
  {
    value: 'timeout_10m',
    label: 'Timeout 10 minutes',
    description: 'Prevent user from chatting for 10 minutes.',
    severity: 'moderate',
    requiresNote: true,
    icon: Timer,
  },
  {
    value: 'timeout_1h',
    label: 'Timeout 1 hour',
    description: 'Prevent user from chatting for 1 hour.',
    severity: 'moderate',
    requiresNote: true,
    icon: Timer,
  },
  {
    value: 'ban_chat',
    label: 'Ban from chat',
    description: 'Permanently ban user from chat.',
    severity: 'severe',
    requiresNote: true,
    icon: Ban,
  },
  {
    value: 'lift_chat_ban',
    label: 'Lift chat ban',
    description: 'Restore chat access for this user.',
    severity: 'info',
    requiresNote: true,
    icon: Unlock,
  },
  {
    value: 'ban_platform',
    label: 'Ban from platform',
    description: 'Permanently ban user from the entire platform.',
    severity: 'severe',
    requiresNote: true,
    icon: ShieldOff,
  },
  {
    value: 'unban_platform',
    label: 'Unban from platform',
    description: 'Restore platform access for this user.',
    severity: 'info',
    requiresNote: true,
    icon: ShieldCheck,
  },
];

const SEVERITY_STYLES: Record<
  ActionSeverity,
  { card: string; selected: string; icon: string; ring: string }
> = {
  info: {
    card: 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
    selected: 'border-primary bg-primary/5',
    icon: 'text-muted-foreground',
    ring: 'ring-primary/30',
  },
  moderate: {
    card: 'border-border hover:border-amber-500/40 hover:bg-amber-500/5',
    selected: 'border-amber-500 bg-amber-500/5',
    icon: 'text-amber-500',
    ring: 'ring-amber-500/30',
  },
  severe: {
    card: 'border-border hover:border-destructive/40 hover:bg-destructive/5',
    selected: 'border-destructive bg-destructive/5',
    icon: 'text-destructive',
    ring: 'ring-destructive/30',
  },
};

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'destructive' as const, icon: Flag },
  REVIEWED: { label: 'Reviewed', variant: 'secondary' as const, icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', variant: 'outline' as const, icon: XCircle },
};

const ACTION_LABELS: Record<NonNullable<ChatReportCase['lastAction']>, string> = {
  REVIEW: 'Marked as reviewed',
  DISMISS: 'Dismissed',
  DELETE_REPORTED_MESSAGE: 'Message deleted',
  TIMEOUT_10M: 'User timed out (10m)',
  TIMEOUT_1H: 'User timed out (1h)',
  BAN_CHAT: 'Chat banned',
  LIFT_CHAT_BAN: 'Chat ban lifted',
  BAN_PLATFORM: 'Platform banned',
  UNBAN_PLATFORM: 'Platform ban lifted',
};

const actionGroups: Array<{ label: string; actions: ActionOption[] }> = [
  { label: 'Informational', actions: ACTION_OPTIONS.filter((a) => a.severity === 'info') },
  { label: 'Moderation', actions: ACTION_OPTIONS.filter((a) => a.severity === 'moderate') },
  { label: 'Severe', actions: ACTION_OPTIONS.filter((a) => a.severity === 'severe') },
];

const route = useRoute();
const reportId = computed(() => String(route.params.reportId));

// 401 -> login, 403 -> home, 404 -> not found (like the Next page)
const { data: report, error } = await useFetch<ChatReportCase>('/api/pages/admin-report', {
  query: computed(() => ({ id: reportId.value })),
});

if (error.value) {
  const status = error.value.statusCode;
  if (status === 401) {
    await navigateTo('/auth/hackclub', { external: true });
  } else if (status === 403) {
    await navigateTo('/');
  } else {
    throw createError({ statusCode: 404, statusMessage: 'Report not found', fatal: true });
  }
}

const selectedAction = ref<ReportModerationAction>('review');
const note = ref('');
const isSubmitting = ref(false);

const selectedMeta = computed(() => ACTION_OPTIONS.find((o) => o.value === selectedAction.value)!);
const requiresNote = computed(() => Boolean(selectedMeta.value?.requiresNote));
const isSevere = computed(() => selectedMeta.value?.severity === 'severe');
const statusConfig = computed(() => (report.value ? STATUS_CONFIG[report.value.status] : null));

async function submitAction() {
  if (!report.value) return;
  if (requiresNote.value && note.value.trim().length < 10) {
    toast.error('Please include at least 10 characters for enforcement context.');
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await $fetch.raw<string>('/api/admin/reports', {
      method: 'POST',
      body: {
        reportId: report.value.id,
        action: selectedAction.value,
        note: note.value.trim() || undefined,
      },
      ignoreResponseError: true,
      responseType: 'text',
    });

    if (!res.ok) {
      toast.error((res._data as string | undefined) || 'Failed to apply action');
      return;
    }

    toast.success('Report action applied');
    note.value = '';
    await refreshNuxtData();
  } catch {
    toast.error('Failed to apply action');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="report && statusConfig" class="container max-w-5xl mx-auto py-8 px-4">
    <div class="flex items-start justify-between gap-4 mb-8">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight">Report Case</h1>
          <Badge
            :variant="statusConfig.variant"
            class="flex items-center gap-1.5 text-xs px-2 py-0.5"
          >
            <component :is="statusConfig.icon" class="h-3 w-3" />
            {{ statusConfig.label }}
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground font-mono">{{ report.id }}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="shrink-0 gap-1.5"
        @click="navigateTo(`/admin?tab=reports&reportId=${report.id}`)"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to reports
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="md:col-span-3 space-y-5">
        <div
          v-if="report.reportedMessage"
          class="rounded-lg border border-border bg-muted/20 overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <MessageSquare class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reported message
            </span>
          </div>
          <div class="px-4 py-4">
            <p class="text-sm leading-relaxed break-words">{{ report.reportedMessage }}</p>
          </div>
        </div>
        <div
          v-else
          class="rounded-lg border border-dashed border-border px-4 py-5 flex items-center gap-3 text-muted-foreground"
        >
          <Info class="h-4 w-4 shrink-0" />
          <span class="text-sm">No message content was captured with this report.</span>
        </div>

        <div class="rounded-lg border border-border overflow-hidden">
          <div class="px-4 py-3 border-b border-border bg-muted/20">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-muted-foreground"><User class="h-3.5 w-3.5" /></span>
              <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Parties
              </span>
            </div>
          </div>
          <div class="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Reporter
              </span>
              <span class="text-sm"><span class="font-medium">{{ report.reporter }}</span></span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Target
              </span>
              <span class="text-sm">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-medium">{{ report.target }}</span>
                  <Badge
                    v-if="report.targetIsAdmin"
                    variant="outline"
                    class="text-[10px] py-0 px-1.5 text-amber-500 border-amber-500/40"
                  >
                    Admin
                  </Badge>
                  <Badge
                    v-if="report.targetIsPlatformBanned"
                    variant="outline"
                    class="text-[10px] py-0 px-1.5 text-destructive border-destructive/40"
                  >
                    Platform banned
                  </Badge>
                </div>
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Channel
              </span>
              <span class="text-sm">
                <span class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {{ report.channelName }}
                </span>
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Reason
              </span>
              <span class="text-sm"><span>{{ report.reason }}</span></span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border overflow-hidden">
          <div class="px-4 py-3 border-b border-border bg-muted/20">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-muted-foreground"><Clock class="h-3.5 w-3.5" /></span>
              <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Timeline
              </span>
            </div>
          </div>
          <div class="px-4 py-4 space-y-4">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Filed
              </span>
              <span class="text-sm">
                <ClientOnly>
                  <span>
                    {{ format(new Date(report.createdAt), 'PPP p') }}
                    <span class="text-muted-foreground text-xs">
                      ({{ formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) }})
                    </span>
                  </span>
                </ClientOnly>
              </span>
            </div>
            <div v-if="report.handledAt" class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Last handled
              </span>
              <span class="text-sm">
                <ClientOnly>
                  <span>
                    {{ format(new Date(report.handledAt), 'PPP p') }}
                    <span class="text-muted-foreground text-xs">
                      ({{ formatDistanceToNow(new Date(report.handledAt), { addSuffix: true }) }})
                    </span>
                  </span>
                </ClientOnly>
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Last action
              </span>
              <span class="text-sm">
                <span v-if="report.lastAction" class="font-medium">
                  {{ ACTION_LABELS[report.lastAction] }}
                </span>
                <span v-else class="text-muted-foreground">None</span>
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Handled by
              </span>
              <span class="text-sm">
                <span v-if="report.handledBy" class="font-medium">{{ report.handledBy }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </span>
            </div>
            <div v-if="report.handlingNote" class="pt-1">
              <span
                class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5"
              >
                Last note
              </span>
              <p
                class="text-sm bg-muted/40 rounded-md px-3 py-2.5 leading-relaxed border border-border"
              >
                {{ report.handlingNote }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="report.targetIsAdmin"
          class="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          <AlertTriangle class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div class="text-sm text-amber-700 dark:text-amber-400 leading-snug">
            <span class="font-semibold">Caution:</span> The reported user is a platform admin.
            Enforcement actions will still apply.
          </div>
        </div>
      </div>

      <div class="md:col-span-2">
        <div class="rounded-lg border border-border overflow-hidden sticky top-6">
          <div class="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <Gavel class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enforcement
            </span>
          </div>

          <div class="px-4 py-4 space-y-5">
            <!-- Action selector -->
            <div class="space-y-3">
              <div v-for="group in actionGroups" :key="group.label">
                <p
                  class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
                >
                  {{ group.label }}
                </p>
                <div class="space-y-1.5">
                  <button
                    v-for="action in group.actions"
                    :key="action.value"
                    type="button"
                    :class="
                      cn(
                        'w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-all cursor-pointer',
                        selectedAction === action.value
                          ? `${SEVERITY_STYLES[action.severity].selected} ring-1 ${SEVERITY_STYLES[action.severity].ring}`
                          : SEVERITY_STYLES[action.severity].card
                      )
                    "
                    @click="selectedAction = action.value"
                  >
                    <span
                      :class="
                        cn(
                          'mt-0.5 shrink-0',
                          selectedAction === action.value
                            ? SEVERITY_STYLES[action.severity].icon
                            : 'text-muted-foreground'
                        )
                      "
                    >
                      <component :is="action.icon" class="h-4 w-4" />
                    </span>
                    <div class="min-w-0">
                      <p
                        :class="
                          cn(
                            'text-sm font-medium leading-tight',
                            selectedAction === action.value &&
                              action.severity === 'severe' &&
                              'text-destructive',
                            selectedAction === action.value &&
                              action.severity === 'moderate' &&
                              'text-amber-600 dark:text-amber-400'
                          )
                        "
                      >
                        {{ action.label }}
                      </p>
                      <p class="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {{ action.description }}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <Separator />

            <div class="space-y-2">
              <Label for="note" class="text-xs">
                Moderator note
                <span v-if="requiresNote" class="text-destructive ml-1">*</span>
                <span v-else class="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Textarea
                id="note"
                v-model="note"
                placeholder="Explain why this action is being taken."
                :rows="3"
                class="text-sm resize-none"
              />
              <p v-if="requiresNote" class="text-[11px] text-muted-foreground">
                Min. 10 characters required.
              </p>
            </div>

            <div
              v-if="isSevere"
              class="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            >
              <ShieldAlert class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p class="text-[12px] text-destructive leading-snug">
                This is a severe action may often not be easily undone. Double-check before
                applying.
              </p>
            </div>

            <Button
              :disabled="isSubmitting"
              :variant="isSevere ? 'destructive' : 'default'"
              class="w-full gap-2"
              size="sm"
              @click="submitAction"
            >
              <Gavel class="h-3.5 w-3.5" />
              {{ isSubmitting ? 'Applying…' : 'Apply action' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
