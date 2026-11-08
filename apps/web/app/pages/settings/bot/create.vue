<script setup lang="ts">
import { Bot } from '@lucide/vue';
import SettingsForm from '~/components/settings/SettingsForm.vue';
import type { SettingsFormResult } from '~/components/settings/SettingsForm.vue';

definePageMeta({ middleware: 'protected' });

const fields = [
  {
    name: 'name',
    type: 'text',
    label: 'Bot Name',
    placeholder: 'Enter bot name',
    required: true,
  },
  {
    name: 'slug',
    type: 'text',
    label: 'Bot Slug',
    placeholder: 'Enter bot slug',
    required: true,
  },
  {
    name: 'description',
    type: 'textarea',
    textArea: true,
    label: 'Description',
    placeholder: 'Enter bot description',
  },
];

async function onActionComplete(res: SettingsFormResult) {
  // the Next page pushed to the new bot whenever the action returned (UniversalForm only
  // called back with the result; a failed result has no slug)
  if (res.success && res.slug) {
    await navigateTo(`/settings/bot/${res.slug}`);
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
          <Bot class="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 class="mb-2 text-3xl font-bold text-foreground">Create Bot Account</h1>
        <p class="text-muted-foreground max-w-xl">
          Create an automated bot account to provide custom functionality for your community.
        </p>
      </div>

      <div class="w-full max-w-md bg-card rounded-xl p-8 border border-border">
        <SettingsForm :fields="fields" action="createBot" @action-complete="onActionComplete" />
      </div>
    </div>
  </div>
</template>
