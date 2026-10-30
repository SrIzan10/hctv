<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';
import { processMarkdown, renderHast } from './useProcessor';

const props = defineProps<{
  textValue: string;
  class?: HTMLAttributes['class'];
}>();

const { channels } = useAllChannels();

const tree = computed(() => processMarkdown(props.textValue ?? ''));
const Rendered = () => renderHast(tree.value, channels.value);
</script>

<template>
  <div
    :class="
      cn(
        'w-full overflow-auto prose dark:prose-invert prose-sm px-1 border border-transparent prose-headings:font-cal',
        props.class
      )
    "
  >
    <Rendered />
  </div>
</template>
