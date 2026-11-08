<script setup lang="ts">
import { ref } from 'vue';
import { Switch } from '~/components/ui/switch';
import { callAction } from '~/lib/actions';

const props = defineProps<{ channel: string; toggled: boolean }>();

const toggled = ref(props.toggled);
const isLoading = ref(false);

async function handleToggle() {
  isLoading.value = true;
  try {
    const res = (await callAction('notifyStreamToggle', { channelName: props.channel })) as {
      success: boolean;
      toggle?: boolean;
    };
    if (res.success) {
      toggled.value = res.toggle!;
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Switch :model-value="toggled" :disabled="isLoading" @update:model-value="handleToggle" />
</template>
