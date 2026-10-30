<script setup lang="ts">
import { UserMinus } from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
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
      title: 'Remove Manager',
      description: `Are you sure you want to remove ${personalChannel?.name} as a manager? They will no longer be able to stream or moderate this channel.`,
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
  <Card>
    <CardHeader>
      <CardTitle>Channel Managers</CardTitle>
      <CardDescription>Manage who can help moderate and stream to this channel.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Current Managers</h3>
          <AddManagerDialog
            v-if="isOwner"
            :channel-id="channel.id"
            :existing-managers="[...channel.managers.map((m) => m.id), channel.owner.id]"
          />
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 border rounded-lg">
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="channel.owner.pfpUrl" />
                <AvatarFallback>{{ channel.owner.slack_id[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ channel.ownerPersonalChannel?.name }}</p>
                <p class="text-sm text-mantle-foreground">Channel Owner</p>
              </div>
            </div>
            <ChannelRoleBadges :roles="['owner', 'chatModerator']" />
          </div>

          <div
            v-for="manager in channel.managers"
            :key="manager.id"
            class="flex items-center justify-between p-3 border rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage :src="manager.pfpUrl" />
                <AvatarFallback>{{ personalChannelOf(manager.id)?.name }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ personalChannelOf(manager.id)?.name }}</p>
                <p class="text-sm text-mantle-foreground">Manager</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <ChannelRoleBadges
                :roles="withPlatformAdmin(['manager', 'chatModerator'], manager.isAdmin)"
              />
              <Button v-if="isOwner" variant="outline" size="sm" @click="removeManager(manager.id)">
                <UserMinus class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p v-if="channel.managers.length === 0" class="text-mantle-foreground text-center py-8">
            No managers added yet.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
