<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Activity,
  ClipboardList,
  Flag,
  Settings,
  Shield,
  Tv,
  Users,
} from '@lucide/vue';
import type { Component } from 'vue';
import { toast } from 'vue-sonner';
import type { User } from '@hctv/db';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import AuditSection from '~/components/admin/AuditSection.vue';
import ChannelsSection from '~/components/admin/ChannelsSection.vue';
import DateTimePicker from '~/components/admin/DateTimePicker.vue';
import ReportsSection from '~/components/admin/ReportsSection.vue';
import SettingsSection from '~/components/admin/SettingsSection.vue';
import UsersSection from '~/components/admin/UsersSection.vue';
import { ADMIN_TABS } from '~/components/admin/types';
import type {
  AdminTab,
  AuditLog,
  ChannelWithRestriction,
  ChatReport,
  UserWithBan,
} from '~/components/admin/types';
import { cn } from '~/lib/utils';

definePageMeta({ middleware: 'protected' });

const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: Component }> = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'channels', label: 'Channels', icon: Tv },
  { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const confirm = useConfirm();
const route = useRoute();
const router = useRouter();

// admin/page.tsx guard: not signed in -> login, not an admin -> home
const { data: me, error: meError } = await useFetch<{ user: User }>('/api/pages/admin-me');
if (meError.value) {
  if (meError.value.statusCode === 401) {
    await navigateTo('/auth/hackclub', { external: true });
  } else {
    await navigateTo('/');
  }
}
const currentUser = computed(() => me.value?.user ?? null);

// nuqs query state: ?tab=<tab> (default 'users') and ?reportId=<id>
const tabParam = computed(() =>
  typeof route.query.tab === 'string' && route.query.tab ? route.query.tab : 'users'
);
const reportIdParam = computed(() =>
  typeof route.query.reportId === 'string' && route.query.reportId ? route.query.reportId : null
);
const activeTab = computed<AdminTab>(() => {
  if (reportIdParam.value) return 'reports';
  return (ADMIN_TABS as readonly string[]).includes(tabParam.value)
    ? (tabParam.value as AdminTab)
    : 'users';
});
const highlightReportId = computed(() => reportIdParam.value);

const userSearch = ref('');
const channelSearch = ref('');
const users = ref<UserWithBan[]>([]);
const channels = ref<ChannelWithRestriction[]>([]);
const usersLoading = ref(false);
const channelsLoading = ref(false);
const auditLoading = ref(false);
const reportsLoading = ref(false);
const loggingOutOthers = ref(false);
const auditLogs = ref<AuditLog[]>([]);
const reports = ref<ChatReport[]>([]);

const banDialogOpen = ref(false);
const restrictDialogOpen = ref(false);
const selectedUser = ref<UserWithBan | null>(null);
const selectedChannel = ref<ChannelWithRestriction | null>(null);
const reason = ref('');
const expiresAt = ref<Date | undefined>(undefined);

// fetch helpers: the admin endpoints answer errors as plain text bodies
async function getJson<T>(url: string, query?: Record<string, string>): Promise<T | null> {
  const res = await $fetch.raw<T>(url, { query, ignoreResponseError: true });
  return res.ok ? (res._data as T) : null;
}

async function postAdmin(url: string, body: Record<string, unknown>) {
  const res = await $fetch.raw<string>(url, {
    method: 'POST',
    body,
    ignoreResponseError: true,
    responseType: 'text',
  });
  const text = (res._data as string | undefined) ?? '';
  return {
    ok: res.ok,
    text,
    json<T>() {
      return JSON.parse(text) as T;
    },
  };
}

async function fetchUsers(search: string) {
  usersLoading.value = true;
  try {
    const data = await getJson<UserWithBan[]>('/api/admin/users', { search });
    if (data) users.value = data;
  } catch {
    toast.error('Failed to fetch users');
  } finally {
    usersLoading.value = false;
  }
}

async function fetchChannels(search: string) {
  channelsLoading.value = true;
  try {
    const data = await getJson<ChannelWithRestriction[]>('/api/admin/channels', { search });
    if (data) channels.value = data;
  } catch {
    toast.error('Failed to fetch channels');
  } finally {
    channelsLoading.value = false;
  }
}

async function fetchAuditLogs() {
  auditLoading.value = true;
  try {
    const data = await getJson<AuditLog[]>('/api/admin/audit', { take: '200' });
    if (data) auditLogs.value = data;
  } catch {
    toast.error('Failed to fetch audit logs');
  } finally {
    auditLoading.value = false;
  }
}

async function fetchReports(reportId?: string) {
  reportsLoading.value = true;
  try {
    const query: Record<string, string> = { take: '200' };
    if (reportId) query.reportId = reportId;
    const data = await getJson<{ reports: ChatReport[]; reportId?: string | null }>(
      '/api/admin/reports',
      query
    );
    if (data) reports.value = data.reports;
  } catch {
    toast.error('Failed to fetch reports');
  } finally {
    reportsLoading.value = false;
  }
}

onMounted(() => {
  fetchUsers('');
  fetchChannels('');
  fetchAuditLogs();
  fetchReports(reportIdParam.value ?? undefined);
});

watch(reportIdParam, (id, prev) => {
  if (id !== prev) fetchReports(id ?? undefined);
});

// debounced searches (the Next page ran a 300ms timeout effect per search term)
let userSearchTimer: ReturnType<typeof setTimeout> | undefined;
let channelSearchTimer: ReturnType<typeof setTimeout> | undefined;
watch(userSearch, (search) => {
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(() => fetchUsers(search), 300);
});
watch(channelSearch, (search) => {
  clearTimeout(channelSearchTimer);
  channelSearchTimer = setTimeout(() => fetchChannels(search), 300);
});
onBeforeUnmount(() => {
  clearTimeout(userSearchTimer);
  clearTimeout(channelSearchTimer);
});

// scroll the highlighted report into view
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
watch([highlightReportId, activeTab, reports], () => {
  clearTimeout(scrollTimer);
  if (!highlightReportId.value || activeTab.value !== 'reports') return;
  const id = highlightReportId.value;
  scrollTimer = setTimeout(() => {
    const target = document.getElementById(`report-card-${id}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
});
onBeforeUnmount(() => clearTimeout(scrollTimer));

function resetDialogState() {
  reason.value = '';
  expiresAt.value = undefined;
  selectedUser.value = null;
  selectedChannel.value = null;
}

async function handleBanUser() {
  if (!selectedUser.value || !reason.value.trim()) {
    toast.error('Please provide a reason');
    return;
  }
  try {
    const res = await postAdmin('/api/admin/users', {
      userId: selectedUser.value.id,
      action: 'ban',
      reason: reason.value,
      expiresAt: expiresAt.value?.toISOString(),
    });
    if (res.ok) {
      toast.success('User banned');
      fetchUsers(userSearch.value);
      fetchAuditLogs();
      banDialogOpen.value = false;
      resetDialogState();
    } else {
      toast.error(res.text || 'Failed to ban user');
    }
  } catch {
    toast.error('Failed to ban user');
  }
}

async function handleUnbanUser(userId: string) {
  try {
    const res = await postAdmin('/api/admin/users', { userId, action: 'unban' });
    if (res.ok) {
      toast.success('User unbanned');
      fetchUsers(userSearch.value);
      fetchAuditLogs();
    } else {
      toast.error('Failed to unban user');
    }
  } catch {
    toast.error('Failed to unban user');
  }
}

async function handleRestrictChannel() {
  if (!selectedChannel.value || !reason.value.trim()) {
    toast.error('Please provide a reason');
    return;
  }
  try {
    const res = await postAdmin('/api/admin/channels', {
      channelId: selectedChannel.value.id,
      action: 'restrict',
      reason: reason.value,
      expiresAt: expiresAt.value?.toISOString(),
    });
    if (res.ok) {
      toast.success('Channel restricted');
      fetchChannels(channelSearch.value);
      fetchAuditLogs();
      restrictDialogOpen.value = false;
      resetDialogState();
    } else {
      toast.error(res.text || 'Failed to restrict channel');
    }
  } catch {
    toast.error('Failed to restrict channel');
  }
}

async function handleUnrestrictChannel(channelId: string) {
  try {
    const res = await postAdmin('/api/admin/channels', { channelId, action: 'unrestrict' });
    if (res.ok) {
      toast.success('Channel unrestricted');
      fetchChannels(channelSearch.value);
      fetchAuditLogs();
    } else {
      toast.error('Failed to unrestrict channel');
    }
  } catch {
    toast.error('Failed to unrestrict channel');
  }
}

async function handlePromoteUser(userId: string) {
  try {
    const res = await postAdmin('/api/admin/users', { userId, action: 'promote' });
    if (res.ok) {
      toast.success('User promoted to admin');
      fetchUsers(userSearch.value);
      fetchAuditLogs();
    } else {
      toast.error(res.text || 'Failed to promote user');
    }
  } catch {
    toast.error('Failed to promote user');
  }
}

async function handleDemoteUser(userId: string) {
  try {
    const res = await postAdmin('/api/admin/users', { userId, action: 'demote' });
    if (res.ok) {
      toast.success('User demoted');
      fetchUsers(userSearch.value);
      fetchAuditLogs();
    } else {
      toast.error(res.text || 'Failed to demote user');
    }
  } catch {
    toast.error('Failed to demote user');
  }
}

async function handleToggleBypassVerification(userId: string) {
  try {
    const res = await postAdmin('/api/admin/users', {
      userId,
      action: 'toggle_bypass_verification',
    });
    if (res.ok) {
      const data = res.json<{ message: string }>();
      toast.success(data.message);
      fetchUsers(userSearch.value);
      fetchAuditLogs();
    } else {
      toast.error(res.text || 'Failed to toggle bypass verification');
    }
  } catch {
    toast.error('Failed to toggle bypass verification');
  }
}

async function handleLogoutOthers() {
  const confirmed = await confirm({
    title: 'Log Out Everyone Else',
    description:
      'This will immediately sign out every other active session on hackclub.tv and keep only your current session active.',
    confirmText: 'Log Out Others',
    cancelText: 'Cancel',
  });

  if (!confirmed) return;

  loggingOutOthers.value = true;
  try {
    const res = await postAdmin('/api/admin/users', { action: 'logout_others' });

    if (!res.ok) {
      toast.error(res.text || 'Failed to log out other sessions');
      return;
    }

    const data = res.json<{ invalidatedSessions: number }>();
    toast.success(
      data.invalidatedSessions > 0
        ? `Logged out ${data.invalidatedSessions} other session${data.invalidatedSessions === 1 ? '' : 's'}`
        : 'No other active sessions were found'
    );
    await refreshNuxtData();
  } catch {
    toast.error('Failed to log out other sessions');
  } finally {
    loggingOutOthers.value = false;
  }
}

const openReports = computed(() => reports.value.filter((r) => r.status === 'OPEN').length);

async function switchTab(tab: AdminTab) {
  const query = { ...route.query };
  if (tab === 'users') delete query.tab;
  else query.tab = tab;
  if (tab !== 'reports') delete query.reportId;
  await router.replace({ query });
  await nextTick();
}

function onBanDialogOpenChange(open: boolean) {
  banDialogOpen.value = open;
  if (!open) resetDialogState();
}

function onRestrictDialogOpenChange(open: boolean) {
  restrictDialogOpen.value = open;
  if (!open) resetDialogState();
}

function openBanDialog(user: UserWithBan) {
  selectedUser.value = user;
  banDialogOpen.value = true;
}

function openRestrictDialog(channel: ChannelWithRestriction) {
  selectedChannel.value = channel;
  restrictDialogOpen.value = true;
}
</script>

<template>
  <div v-if="currentUser" class="min-h-screen">
    <!-- Page header -->
    <div class="border-b border-border bg-card/50 backdrop-blur-sm">
      <div class="container max-w-6xl mx-auto px-4 py-5">
        <div class="flex items-center justify-between gap-6">
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield class="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-tight pb-0 mb-0">Admin Panel</h1>
              <p class="text-xs text-muted-foreground">
                Signed in as
                <span class="font-medium text-foreground">{{ currentUser.email }}</span>
              </p>
            </div>
          </div>

          <div class="flex flex-col items-end gap-3">
            <div
              class="hidden sm:flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5"
            >
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <Users class="h-3 w-3" />
                {{ users.length }} users
              </span>
              <span class="text-border mx-1">|</span>
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity class="h-3 w-3" />
                {{ auditLogs.length }} events
              </span>
              <template v-if="openReports > 0">
                <span class="text-border mx-1">|</span>
                <span class="flex items-center gap-1 text-xs text-muted-foreground text-destructive">
                  <Flag class="h-3 w-3" />
                  {{ openReports }} open
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Body: sidebar + content -->
    <div class="container max-w-6xl mx-auto px-4 py-6">
      <div class="flex gap-6">
        <!-- Sidebar nav -->
        <nav class="w-44 shrink-0 space-y-1">
          <button
            v-for="item in NAV_ITEMS"
            :key="item.id"
            :class="
              cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left',
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )
            "
            @click="switchTab(item.id)"
          >
            <span
              :class="
                cn(
                  'shrink-0 transition-colors',
                  activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                )
              "
            >
              <component :is="item.icon" class="h-4 w-4" />
            </span>
            {{ item.label }}
            <span
              v-if="item.id === 'reports' && openReports > 0"
              class="ml-auto text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none"
            >
              {{ openReports }}
            </span>
          </button>
        </nav>

        <!-- Content panel -->
        <div class="flex-1 min-w-0">
          <UsersSection
            v-if="activeTab === 'users'"
            v-model:search="userSearch"
            :users="users"
            :loading="usersLoading"
            :current-user-id="currentUser.id"
            @ban="openBanDialog"
            @unban="handleUnbanUser"
            @promote="handlePromoteUser"
            @demote="handleDemoteUser"
          />

          <ChannelsSection
            v-if="activeTab === 'channels'"
            v-model:search="channelSearch"
            :channels="channels"
            :loading="channelsLoading"
            @restrict="openRestrictDialog"
            @unrestrict="handleUnrestrictChannel"
          />

          <AuditSection
            v-if="activeTab === 'audit'"
            :logs="auditLogs"
            :loading="auditLoading"
            @refresh="fetchAuditLogs"
          />

          <ReportsSection
            v-if="activeTab === 'reports'"
            :reports="reports"
            :loading="reportsLoading"
            :highlight-report-id="highlightReportId"
            @refresh="fetchReports(reportIdParam ?? undefined)"
          />

          <SettingsSection
            v-if="activeTab === 'settings'"
            v-model:search="userSearch"
            :users="users"
            :users-loading="usersLoading"
            :logging-out-others="loggingOutOthers"
            @toggle-bypass="handleToggleBypassVerification"
            @logout-others="handleLogoutOthers"
          />
        </div>
      </div>
    </div>

    <!-- Ban dialog -->
    <Dialog :open="banDialogOpen" @update:open="onBanDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Ban
            <span class="font-semibold">
              {{ selectedUser?.personalChannel?.name ?? selectedUser?.slack_id }}
            </span>
            from the platform. They cannot stream or use the platform while banned.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium">Reason</label>
            <Textarea
              v-model="reason"
              placeholder="Enter the reason for banning this user…"
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium">Expires (optional)</label>
            <p class="text-xs text-muted-foreground mb-2">Leave empty for a permanent ban.</p>
            <DateTimePicker :value="expiresAt" @change="(d) => (expiresAt = d)" />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            @click="
              banDialogOpen = false;
              resetDialogState();
            "
          >
            Cancel
          </Button>
          <Button variant="destructive" @click="handleBanUser">Ban User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Restrict channel dialog -->
    <Dialog :open="restrictDialogOpen" @update:open="onRestrictDialogOpenChange">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restrict Channel</DialogTitle>
          <DialogDescription>
            Restrict <span class="font-semibold">{{ selectedChannel?.name }}</span> from streaming.
            Viewers will not be able to watch this channel.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium">Reason</label>
            <Textarea
              v-model="reason"
              placeholder="Enter the reason for restricting this channel…"
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium">Expires (optional)</label>
            <p class="text-xs text-muted-foreground mb-2">
              Leave empty for a permanent restriction.
            </p>
            <DateTimePicker :value="expiresAt" @change="(d) => (expiresAt = d)" />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            @click="
              restrictDialogOpen = false;
              resetDialogState();
            "
          >
            Cancel
          </Button>
          <Button variant="destructive" @click="handleRestrictChannel">Restrict Channel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
