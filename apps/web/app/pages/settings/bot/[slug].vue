<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import type { BotAccount } from '@hctv/db';
import BotApiKeys from '~/components/settings/BotApiKeys.vue';
import BotGeneralSettings from '~/components/settings/BotGeneralSettings.vue';

definePageMeta({ middleware: 'protected' });

const route = useRoute();
const slug = computed(() => String(route.params.slug));

// 403 -> the Next page redirected back to the bot list (no user / unknown bot / may not update it)
const { data: bot, error } = await useFetch<
  Pick<BotAccount, 'id' | 'displayName' | 'slug' | 'pfpUrl'> & { description: string | null }
>('/api/pages/settings-bot', { query: computed(() => ({ slug: slug.value })) });

if (error.value || !bot.value) {
  await navigateTo('/settings/bot');
}
</script>

<template>
  <div v-if="bot" :key="bot.id" class="container mx-auto py-6 space-y-6">
    <NuxtLink
      to="/settings/bot"
      class="text-sm text-muted-foreground hover:underline flex items-center gap-2"
    >
      <ArrowLeft class="size-4" /> Back to Bot Accounts
    </NuxtLink>
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <img :src="bot.pfpUrl" alt="Bot Avatar" width="48" height="48" class="rounded-full" />
        <div class="flex flex-col">
          <h1 class="text-3xl font-bold tracking-tight">{{ bot.displayName }}</h1>
          <p class="text-muted-foreground">Manage your bot account settings</p>
        </div>
      </div>
    </div>
    <div class="flex w-full gap-4 flex-col md:flex-row *:w-1/2">
      <BotGeneralSettings :bot="bot" />
      <BotApiKeys :slug="slug" />
    </div>
  </div>
</template>
