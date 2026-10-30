<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

defineProps<{ text: string; emojiMap: Map<string, string> }>();

const EMOJI_SPLIT = /(:[\w\-+]+:)/g;
const EMOJI_FULL = /^:[\w\-+]+:$/;

function emojiName(part: string) {
  return part.replaceAll(':', '');
}
</script>

<template>
  <TooltipProvider v-if="text">
    <template v-for="(part, i) in text.split(EMOJI_SPLIT)" :key="i">
      <Tooltip v-if="EMOJI_FULL.test(part) && emojiMap.get(emojiName(part))" :delay-duration="250">
        <TooltipTrigger as-child>
          <span class="inline-flex items-center align-middle mx-0.5">
            <img
              :src="emojiMap.get(emojiName(part))"
              :alt="part"
              width="20"
              height="20"
              class="inline-block"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>{{ part }}</TooltipContent>
      </Tooltip>
      <span v-else-if="part">{{ part }}</span>
    </template>
  </TooltipProvider>
</template>
