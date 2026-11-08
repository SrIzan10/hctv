<script setup lang="ts">
import { Loader2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';

const props = defineProps<Props>();

const isMutating = ref(false);

async function regenerate() {
  isMutating.value = true;
  try {
    const result = await $fetch<{ key?: string }>('/api/rtmp/streamKey', {
      method: 'POST',
      body: { channel: props.channel },
    });
    if (result?.key) {
      await navigator.clipboard.writeText(result.key);
      toast.success('Key regenerated and copied to clipboard');
    }
  } catch (error) {
    const message =
      (error as { data?: unknown; message?: string })?.data ?? (error as Error)?.message;
    toast.error(typeof message === 'string' && message ? message : 'Failed to regenerate key');
  } finally {
    isMutating.value = false;
  }
}

interface Props {
  channel: string;
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    class="float-left"
    :disabled="isMutating"
    @click="regenerate"
  >
    <Loader2 v-if="isMutating" class="animate-spin" />
    Regenerate key
  </Button>
</template>
