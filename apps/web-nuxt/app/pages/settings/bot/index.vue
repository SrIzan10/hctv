<script setup lang="ts">
import { Bot, Calendar, Hash, Plus } from '@lucide/vue';
import type { BotAccount } from '@hctv/db';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

definePageMeta({ middleware: 'protected' });

const { data, error } = await useFetch<{ botAccounts: Serialized<BotAccount>[] }>(
  '/api/pages/settings-bots'
);

if (error.value) {
  await navigateTo('/');
}

type Serialized<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };
</script>

<template>
  <div class="container mx-auto py-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Bot Accounts</h1>
        <p class="text-muted-foreground">Manage your automated bot accounts</p>
      </div>
      <NuxtLink to="/settings/bot/create">
        <Button>
          <Plus class="mr-2 h-4 w-4" />
          Create Bot
        </Button>
      </NuxtLink>
    </div>

    <Separator />

    <div v-if="data?.botAccounts.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="bot in data.botAccounts" :key="bot.id" :to="`/settings/bot/${bot.slug}`">
        <Card class="hover:shadow-md transition-shadow">
          <CardHeader class="pb-3">
            <div class="flex items-center space-x-2">
              <img
                :src="bot.pfpUrl"
                alt="Bot Avatar"
                width="32"
                height="32"
                class="rounded-full"
              />
              <CardTitle class="text-lg">{{ bot.displayName }}</CardTitle>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center space-x-2 text-sm text-muted-foreground">
              <Hash class="h-4 w-4" />
              <span>{{ bot.slug }}</span>
            </div>
            <div class="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar class="h-4 w-4" />
              <ClientOnly>
                <span>{{ new Date(bot.createdAt).toLocaleDateString() }}</span>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
    <Card v-else class="text-center py-8">
      <CardContent class="space-y-4">
        <Bot class="mx-auto h-12 w-12 text-muted-foreground" />
        <div>
          <CardTitle>No bot accounts yet</CardTitle>
          <CardDescription class="mt-2">
            Get started by creating your first bot account
          </CardDescription>
        </div>
        <NuxtLink to="/settings/bot/create">
          <Button>
            <Plus class="mr-2 h-4 w-4" />
            Create Your First Bot
          </Button>
        </NuxtLink>
      </CardContent>
    </Card>
  </div>
</template>
