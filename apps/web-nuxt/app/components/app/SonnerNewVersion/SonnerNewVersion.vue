<script setup lang="ts">
import { toast } from 'vue-sonner';

// polls /api/commit and shows a persistent "refresh" toast once the deployed commit changes
const initialCommitId = ref<string | null>(null);
const commit = ref<string | undefined>();

async function poll() {
  try {
    const data = await $fetch<{ commit?: string }>('/api/commit');
    commit.value = data.commit;
  } catch {
    // ignore transient failures
  }
}

watch(commit, (value) => {
  if (value && !initialCommitId.value) {
    initialCommitId.value = value;
    return;
  }
  if (initialCommitId.value && value && value !== initialCommitId.value) {
    toast('New version available!', {
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload(),
      },
      duration: Infinity,
      position: 'top-center',
    });
    // the old effect chain re-baselined right after showing, so each new deploy toasts once
    initialCommitId.value = value;
  }
});

onMounted(() => {
  poll();
  const id = setInterval(poll, 5000);
  onBeforeUnmount(() => clearInterval(id));
});
</script>

<template>
  <span class="hidden" />
</template>
