<script setup lang="ts">
import type { Component } from 'vue';
import {
  Ban,
  Bot,
  Clock3,
  Crown,
  EllipsisVertical,
  Eraser,
  Flag,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
} from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import EmojiRenderer from './EmojiRenderer.vue';
import type { ChatModerationCommand, User } from './types';

type ChannelRole = NonNullable<User['channelRole']>;

const ROLE_META: Record<ChannelRole, { label: string; icon: Component; className: string }> = {
  owner: { label: 'Owner', icon: Crown, className: 'text-amber-500' },
  manager: { label: 'Manager', icon: Wrench, className: 'text-violet-500' },
  chatModerator: { label: 'Chat Mod', icon: Shield, className: 'text-emerald-500' },
  botModerator: { label: 'Bot Mod', icon: ShieldCheck, className: 'text-cyan-500' },
};

const props = defineProps<MessageProps>();
const emit = defineEmits<{ (e: 'moderationCommand', command: ChatModerationCommand): void }>();

const reportOpen = ref(false);
const reportReason = ref('');
const isSubmittingReport = ref(false);
const displayName = computed(() => props.user?.displayName || props.user?.username);
const role = computed(() => (props.user?.channelRole ? ROLE_META[props.user.channelRole] : null));

const showActions = computed(
  () =>
    props.type === 'message' &&
    Boolean(props.user?.id) &&
    Boolean(props.viewerId) &&
    props.user!.id !== props.viewerId
);
const canMod = computed(() => Boolean(props.canModerate));

function runModeration(command: ChatModerationCommand) {
  emit('moderationCommand', command);
}

function timeout(durationSeconds: number) {
  if (!props.user) return;
  runModeration({
    type: 'mod:timeoutUser',
    targetUserId: props.user.id,
    targetUsername: displayName.value,
    durationSeconds,
    reason: 'Timed out by moderator',
  });
}

async function submitReport() {
  if (!props.user?.id || !props.viewerId || props.viewerId === props.user.id) return;

  const reason = reportReason.value.trim();
  if (reason.length < 10) {
    toast.error('Please include at least 10 characters explaining the report.');
    return;
  }

  isSubmittingReport.value = true;
  try {
    const res = await fetch('/api/stream/chat/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelName: props.channelName,
        targetUserId: props.user.id,
        targetUsername: displayName.value,
        msgId: props.msgId,
        message: props.message,
        reason,
      }),
    });

    if (!res.ok) {
      toast.error((await res.text()) || 'Failed to submit report.');
      return;
    }

    toast.success('Report submitted. Thanks for helping keep chat safe.');
    reportReason.value = '';
    reportOpen.value = false;
  } catch {
    toast.error('Failed to submit report.');
  } finally {
    isSubmittingReport.value = false;
  }
}

function handleReportOpenChange(open: boolean) {
  reportOpen.value = open;
  if (!open) reportReason.value = '';
}

interface MessageProps {
  user?: User;
  message: string;
  type: 'message' | 'systemMsg';
  emojiMap: Map<string, string>;
  msgId?: string;
  canModerate?: boolean;
  viewerId?: string;
  channelName: string;
}
</script>

<template>
  <div v-if="type === 'systemMsg'" class="flex items-center justify-center py-1">
    <span class="text-xs text-muted-foreground italic">{{ message }}</span>
  </div>

  <template v-else>
    <div class="group hover:bg-primary/5 rounded px-2 py-1 -mx-2 transition-colors">
      <div class="flex items-start gap-1.5">
        <div
          lang="en"
          class="text-foreground min-w-0 flex-1 leading-normal"
          style="overflow-wrap: anywhere; word-break: break-word"
        >
          <TooltipProvider>
            <Tooltip v-if="user?.isBot" :delay-duration="200">
              <TooltipTrigger as-child>
                <span class="inline-flex align-[-0.15em] text-muted-foreground mr-[0.3em]">
                  <Bot class="size-[1.1em] shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Bot</TooltipContent>
            </Tooltip>
            <Tooltip v-if="role" :delay-duration="200">
              <TooltipTrigger as-child>
                <span :class="cn('inline-flex align-[-0.15em]', role.className, 'mr-[0.3em]')">
                  <component :is="role.icon" class="size-[1.1em] shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{{ role.label }}</TooltipContent>
            </Tooltip>
            <Tooltip v-if="user?.isPlatformAdmin" :delay-duration="200">
              <TooltipTrigger as-child>
                <span class="inline-flex align-[-0.15em] text-destructive mr-[0.3em]">
                  <ShieldAlert class="size-[1.1em] shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Platform Admin</TooltipContent>
            </Tooltip>
            <span class="font-semibold text-primary">{{ displayName }}</span>
            <span class="font-normal text-muted-foreground select-none">: </span>
          </TooltipProvider>
          <span class="whitespace-pre-wrap break-words">
            <EmojiRenderer :text="message" :emoji-map="emojiMap" />
          </span>
        </div>
        <DropdownMenu v-if="showActions">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-7 w-7 opacity-0 group-hover:opacity-100">
              <EllipsisVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-52">
            <DropdownMenuItem @click="reportOpen = true">
              <Flag class="mr-2 h-4 w-4" />
              Report user
            </DropdownMenuItem>
            <template v-if="canMod">
              <DropdownMenuItem
                @click="msgId && runModeration({ type: 'mod:deleteMessage', msgId })"
              >
                <Eraser class="mr-2 h-4 w-4" />
                Delete message
              </DropdownMenuItem>
              <DropdownMenuItem @click="timeout(300)">
                <Clock3 class="mr-2 h-4 w-4" />
                Timeout 5 min
              </DropdownMenuItem>
              <DropdownMenuItem @click="timeout(3600)">
                <Clock3 class="mr-2 h-4 w-4" />
                Timeout 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem
                class="text-destructive"
                @click="
                  runModeration({
                    type: 'mod:banUser',
                    targetUserId: user!.id,
                    targetUsername: displayName,
                    reason: 'Banned by moderator',
                  })
                "
              >
                <Ban class="mr-2 h-4 w-4" />
                Ban user
              </DropdownMenuItem>
              <DropdownMenuItem
                @click="
                  runModeration({
                    type: 'mod:liftTimeout',
                    targetUserId: user!.id,
                    targetUsername: displayName,
                  })
                "
              >
                <UserRoundCheck class="mr-2 h-4 w-4" />
                Lift timeout/ban
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <Dialog :open="reportOpen" @update:open="handleReportOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report message</DialogTitle>
          <DialogDescription>
            Message against Hack Club's Code of Conduct? Let us know!
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
            <p class="font-medium text-foreground mb-1">Reported user</p>
            <p>{{ displayName }}</p>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ message }}</p>
          </div>
          <div>
            <label class="text-sm font-medium">Reason</label>
            <Textarea
              v-model="reportReason"
              placeholder="Describe why this should be reviewed (harassment, hate speech, spam, threats, etc)."
              :rows="5"
              class="mt-2"
            />
            <p class="text-xs text-muted-foreground mt-1">Minimum 10 characters.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            :disabled="isSubmittingReport"
            @click="handleReportOpenChange(false)"
          >
            Cancel
          </Button>
          <Button
            :disabled="isSubmittingReport || reportReason.trim().length < 10"
            @click="submitReport"
          >
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </template>
</template>
