<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { Check, Copy, Eye, EyeOff } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';

const props = defineProps<{
  value: string;
  label?: string;
  secret?: boolean;
  copiedMessage?: string;
}>();

const isVisible = ref(false);
const isCopied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});

async function copy() {
  if (!props.value) return;
  await navigator.clipboard.writeText(props.value);
  isCopied.value = true;
  toast.success(props.copiedMessage ?? 'Copied to clipboard');
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (isCopied.value = false), 2000);
}
</script>

<template>
  <div class="grid gap-2">
    <p v-if="label" class="text-sm font-medium">{{ label }}</p>
    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <input
          :type="secret && !isVisible ? 'password' : 'text'"
          :value="value"
          :aria-label="label"
          readonly
          :placeholder="value ? undefined : 'Loading...'"
          :class="[
            'h-9 w-full rounded-lg border bg-card px-3 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            secret && 'pr-10',
          ]"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <button
          v-if="secret"
          type="button"
          class="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          :aria-label="isVisible ? `Hide ${label ?? 'value'}` : `Show ${label ?? 'value'}`"
          @click="isVisible = !isVisible"
        >
          <EyeOff v-if="isVisible" class="h-4 w-4" />
          <Eye v-else class="h-4 w-4" />
        </button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        :disabled="!value"
        :aria-label="`Copy ${label ?? 'value'}`"
        @click="copy"
      >
        <Check v-if="isCopied" />
        <Copy v-else />
      </Button>
      <slot />
    </div>
  </div>
</template>
