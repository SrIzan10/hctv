<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { runToastAction } from './actions';
import type { ChannelSettingsChannel } from './types';

const props = defineProps<{ channel: ChannelSettingsChannel }>();

function personalChannelOf(userId: string) {
  return props.channel.followerPersonalChannels.find((c) => c?.ownerId === userId);
}

function toggleGlobalNotifs() {
  void runToastAction(
    'toggleGlobalChannelNotifs',
    { channelId: props.channel.id },
    {
      loading: 'Updating notifications...',
      success: (data) =>
        `${data.toggle ? 'Enabled' : 'Disabled'} global notifications for this channel.`,
      error: 'Failed to update notifications',
    }
  );
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Notification Settings</CardTitle>
      <CardDescription>
        Configure when and how followers are notified about your streams.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium">Stream Notifications</h3>
            <p class="text-sm text-mantle-foreground">
              Send notifications to followers when you go live
            </p>
          </div>
          <Switch
            :model-value="channel.streamInfo[0]?.enableNotifications ?? true"
            @update:model-value="toggleGlobalNotifs"
          />
        </div>

        <Separator />

        <div>
          <h3 class="font-medium mb-3">Followers ({{ channel.followers.length }})</h3>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            <div
              v-for="follower in channel.followers"
              :key="follower.id"
              class="flex items-center justify-between p-2 border rounded"
            >
              <div class="flex items-center gap-2">
                <Avatar class="h-8 w-8">
                  <AvatarFallback>{{ personalChannelOf(follower.user.id)?.name }}</AvatarFallback>
                  <AvatarImage
                    :src="personalChannelOf(follower.user.id)?.pfpUrl ?? ''"
                    :alt="personalChannelOf(follower.user.id)?.name"
                  />
                </Avatar>
                <span class="text-sm">{{ personalChannelOf(follower.user.id)?.name }}</span>
              </div>
              <Badge :variant="follower.notifyStream ? 'default' : 'secondary'">
                {{ follower.notifyStream ? 'Notifications On' : 'Notifications Off' }}
              </Badge>
            </div>
            <p v-if="channel.followers.length === 0" class="text-mantle-foreground text-center py-4">
              No followers yet.
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
