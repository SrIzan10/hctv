<script setup lang="ts">
import type { Channel, Follow } from '@hctv/db';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import NotifyToggle from '~/components/settings/NotifyToggle.vue';

definePageMeta({ middleware: 'protected' });

type FollowWithChannel = Omit<Follow, 'createdAt'> & { channel: Channel };

const { data: following } = await useFetch<FollowWithChannel[]>('/api/pages/settings-follows');
</script>

<template>
  <div
    v-if="!following?.length"
    class="flex h-full w-full flex-col items-center justify-center gap-5 px-4 text-center"
  >
    <div class="space-y-1.5">
      <h1 class="text-2xl font-bold">You're not following anyone yet</h1>
      <p class="text-muted-foreground">
        Follow a channel to get notified when it goes live.
      </p>
    </div>
    <NuxtLink to="/">
      <Button>Browse channels</Button>
    </NuxtLink>
  </div>
  <div v-else class="mx-auto w-full max-w-2xl px-4 py-8">
    <h1 class="mb-6 text-2xl font-bold">Following</h1>
    <Table class="rounded-xl border bg-card">
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead class="w-[100px] text-center">Notifications</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="channel in following" :key="channel.id">
          <TableCell class="font-medium">
            <div class="flex items-center gap-3">
              <Avatar class="h-9 w-9">
                <AvatarImage :src="channel.channel.pfpUrl" :alt="channel.channel.name" />
                <AvatarFallback>{{ channel.channel.name.charAt(0) }}</AvatarFallback>
              </Avatar>
              <NuxtLink :to="`/${channel.channel.name}`" class="hover:underline">
                {{ channel.channel.name }}
              </NuxtLink>
            </div>
          </TableCell>
          <TableCell class="text-center">
            <NotifyToggle :channel="channel.channel.name" :toggled="channel.notifyStream" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
