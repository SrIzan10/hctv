<script setup lang="ts">
import { Textarea } from '../textarea';
import { getCaretCoordinates, getCurrentWord, replaceWord } from './utils';

// markdown textarea with an @mention autocomplete dropdown. The dropdown is a plain list (the React
// version drove a hidden cmdk <Command>; the shadcn-vue Command can't be fed an external search term).
const props = defineProps<{
  textValue: string;
}>();

const emit = defineEmits<{
  setTextValue: [value: string];
}>();

const { channels, error } = useAllChannels();

const textareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null);
const open = ref(false);
const commandValue = ref('');
const position = reactive({ left: 0, top: 0 });
const highlighted = ref(0);

const matches = computed(() => {
  const term = commandValue.value.toLowerCase();
  return channels.value.filter((c) => c.username.toLowerCase().includes(term));
});

watch(matches, () => {
  highlighted.value = 0;
});

function getTextarea() {
  return textareaRef.value?.$el ?? null;
}

function hide() {
  open.value = false;
  commandValue.value = '';
}

function onInput(e: Event) {
  const textarea = getTextarea();
  if (!textarea) return;
  const text = (e.target as HTMLTextAreaElement).value;
  const caret = getCaretCoordinates(textarea, textarea.selectionEnd);
  const currentWord = getCurrentWord(textarea);
  emit('setTextValue', text);

  if (currentWord.startsWith('@')) {
    // drop the @ for filtering
    commandValue.value = currentWord.slice(1);
    position.left = caret.left;
    position.top = caret.top + caret.height;
    open.value = true;
  } else {
    hide();
  }
}

function onSelect(username: string) {
  const textarea = getTextarea();
  if (!textarea) return;
  // add the @ back when replacing
  replaceWord(textarea, `@${username}`);
  hide();
}

function onKeydown(e: KeyboardEvent) {
  const textarea = getTextarea();
  if (!textarea || !open.value || !getCurrentWord(textarea).startsWith('@')) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlighted.value = Math.min(highlighted.value + 1, matches.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlighted.value = Math.max(highlighted.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const match = matches.value[highlighted.value];
    if (match) onSelect(match.username);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    hide();
  }
}

function onSelectionChange() {
  const textarea = getTextarea();
  if (textarea && open.value && !getCurrentWord(textarea).startsWith('@')) hide();
}

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange);
});
onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange);
});

if (error.value) console.error('Error fetching channels:', error.value);
</script>

<template>
  <div class="relative w-full">
    <Textarea
      ref="textareaRef"
      autocomplete="off"
      autocorrect="off"
      class="h-auto resize-none"
      :model-value="props.textValue"
      :rows="5"
      @input="onInput"
      @keydown="onKeydown"
      @blur="hide"
    />
    <p class="prose-none mt-1 text-sm text-muted-foreground">Supports markdown.</p>
    <div
      v-show="open"
      class="absolute z-50 h-auto max-h-32 max-w-min overflow-y-scroll rounded-md border border-popover bg-popover text-popover-foreground shadow"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
      @mousedown.prevent.stop
    >
      <div class="overflow-hidden p-1">
        <div
          v-for="(c, i) in matches"
          :key="c.id"
          :data-highlighted="i === highlighted ? '' : undefined"
          class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
          @mouseenter="highlighted = i"
          @click="onSelect(c.username)"
        >
          {{ c.username }}
        </div>
      </div>
    </div>
  </div>
</template>
