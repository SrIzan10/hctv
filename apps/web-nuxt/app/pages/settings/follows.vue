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
    class="flex flex-col items-center justify-center w-full h-full"
  >
    <h1 class="text-2xl font-bold">No channels followed</h1>
    <p class="text-muted-foreground">Go follow some first?</p>
    <NuxtLink to="/">
      <Button>Back home</Button>
    </NuxtLink>
  </div>
  <div v-else class="container py-10">
    <h1 class="text-2xl font-bold mb-6">Followed Channels</h1>
    <Table class="max-w-2xl mx-auto outline-surface bg-mantle rounded-md overflow-hidden">
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
