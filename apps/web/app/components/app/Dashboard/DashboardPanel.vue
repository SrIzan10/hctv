<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

// a stream manager panel: small header, dense body. Mirrors the embedded chat panel.
const props = defineProps<{
  title: string;
  class?: HTMLAttributes['class'];
  bodyClass?: HTMLAttributes['class'];
}>();
</script>

<template>
  <section
    :class="cn('flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card', props.class)"
  >
    <header class="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
      <h2 class="text-[13px] font-bold">{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div :class="cn('min-h-0 flex-1', bodyClass)">
      <slot />
    </div>
  </section>
</template>
