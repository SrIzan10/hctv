<script setup lang="ts">
import { UserMinus } from '@lucide/vue';
import { Button } from '~/components/ui/button';
import PersonRow from '~/components/settings/PersonRow.vue';
import SettingsSection from '~/components/settings/SettingsSection.vue';
import AddManagerDialog from './AddManagerDialog.vue';
import ChannelRoleBadges from './ChannelRoleBadges.vue';
import { withPlatformAdmin } from './types';
import type { ChannelSettingsChannel } from './types';
import { callAction } from '~/lib/actions';

const props = defineProps<{ channel: ChannelSettingsChannel; isOwner: boolean }>();

const confirm = useConfirm();

function personalChannelOf(managerId: string) {
  return props.channel.managerPersonalChannels.find((c) => c?.ownerId === managerId);
}

async function removeManager(managerId: string) {
  const personalChannel = personalChannelOf(managerId);
  if (
    await confirm({
      title: 'Remove manager?',
      description: `${personalChannel?.name ?? 'This person'} will no longer be able to stream to or moderate this channel.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
    })
  ) {
    await callAction('removeChannelManager', { channelId: props.channel.id, userId: managerId });
    await refreshNuxtData();
  }
}
</script>

<template>
  <div>
    <SettingsSection
      title="Managers"
      description="Managers can stream to this channel and moderate its chat."
    >
      <template v-if="isOwner" #aside>
        <AddManagerDialog
          :channel-id="channel.id"
          :existing-managers="[...channel.managers.map((m) => m.id), channel.owner.id]"
        />
      </template>
      <ul class="divide-y rounded-xl border bg-card">
        <PersonRow
          :name="channel.ownerPersonalChannel?.name"
          :pfp-url="channel.owner.pfpUrl"
          subtitle="Owner"
        >
          <ChannelRoleBadges :roles="['owner']" />
        </PersonRow>
        <PersonRow
          v-for="manager in channel.managers"
          :key="manager.id"
          :name="personalChannelOf(manager.id)?.name"
          :pfp-url="manager.pfpUrl"
          subtitle="Manager"
        >
          <ChannelRoleBadges :roles="withPlatformAdmin(['manager'], manager.isAdmin)" />
          <Button
            v-if="isOwner"
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-destructive"
            :aria-label="`Remove ${personalChannelOf(manager.id)?.name ?? 'manager'}`"
            @click="removeManager(manager.id)"
          >
            <UserMinus />
          </Button>
        </PersonRow>
      </ul>
      <p v-if="channel.managers.length === 0" class="mt-3 text-sm text-muted-foreground">
        No managers yet. Add someone to share streaming and moderation duties.
      </p>
    </SettingsSection>
  </div>
</template>
