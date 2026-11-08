<script setup lang="ts">
import { Hash } from '@lucide/vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormResult } from '~/components/settings/SettingsForm.vue';

definePageMeta({ middleware: 'protected' });

const fields = [
  { label: 'Channel Name', name: 'name', type: 'text', placeholder: 'Enter channel name' },
];

async function onActionComplete(r: SettingsFormResult) {
  const channelName = r.channel;
  if (channelName) {
    await navigateTo(`/${channelName}`);
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="flex h-full w-full flex-col items-center justify-center px-4 py-12">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Hash class="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 class="mb-2 text-3xl font-bold text-foreground">Create New Channel</h1>
        <p class="text-muted-foreground max-w-xl">
          IRL hackathons, game streams, and more are allowed! Create another channel apart from your
          personal one to diversify your content.
        </p>
      </div>

      <div class="w-full max-w-md bg-card rounded-xl shadow-xl p-8 border border-border">
        <SettingsForm :fields="fields" action="createChannel" @action-complete="onActionComplete" />
      </div>

      <p class="mt-6 text-sm text-muted-foreground text-center max-w-md">
        Your channel will be ready to go live immediately after creation. You can always customize
        settings later.
      </p>
    </div>
  </div>
</template>
