<script setup lang="ts">
import { Bot, ChevronRight, Plus } from '@lucide/vue';
import type { BotAccount } from '@hctv/db';
import { Button } from '~/components/ui/button';

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
  <div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Bot accounts</h1>
        <p class="text-muted-foreground">Bots post in chat using an API key.</p>
      </div>
      <NuxtLink v-if="data?.botAccounts.length" to="/settings/bot/create">
        <Button>
          <Plus />
          Create bot
        </Button>
      </NuxtLink>
    </div>

    <ul v-if="data?.botAccounts.length" class="divide-y rounded-xl border bg-card">
      <li v-for="bot in data.botAccounts" :key="bot.id">
        <NuxtLink
          :to="`/settings/bot/${bot.slug}`"
          class="flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent"
        >
          <img
            :src="bot.pfpUrl"
            alt=""
            width="36"
            height="36"
            class="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{{ bot.displayName }}</p>
            <p class="truncate text-sm text-muted-foreground">{{ bot.slug }}</p>
          </div>
          <ClientOnly>
            <span class="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              Created {{ new Date(bot.createdAt).toLocaleDateString() }}
            </span>
          </ClientOnly>
          <ChevronRight class="h-4 w-4 text-muted-foreground" />
        </NuxtLink>
      </li>
    </ul>
    <div
      v-else
      class="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center"
    >
      <Bot class="h-10 w-10 text-muted-foreground" />
      <div class="space-y-1">
        <p class="font-bold">No bots yet</p>
        <p class="text-sm text-muted-foreground">
          Create a bot to get an API key for posting in chat.
        </p>
      </div>
      <NuxtLink to="/settings/bot/create">
        <Button>
          <Plus />
          Create bot
        </Button>
      </NuxtLink>
    </div>
  </div>
</template>
