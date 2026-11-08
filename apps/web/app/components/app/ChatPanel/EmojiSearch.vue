<script setup lang="ts">
// source: ai
import { Check } from '@lucide/vue';

const props = defineProps<EmojiSearchProps>();
const emit = defineEmits<{ (e: 'select', emoji: string): void }>();

const searchTerm = ref<string | null>(null);
const searchResults = ref<string[]>([]);
const selectedIndex = ref(0);
const resultsRef = ref<HTMLDivElement | null>(null);

watch(
  () => [props.message, props.cursorPosition, props.socket] as const,
  () => {
    const beforeCursor = props.message.substring(0, props.cursorPosition);
    const match = beforeCursor.match(/:[\w\-+]*$/);

    if (match) {
      const term = match[0].substring(1);
      searchTerm.value = term;

      if (term.length > 0) {
        const localResults = Array.from(props.emojiMap.keys())
          .filter((name) => name.toLowerCase().includes(term.toLowerCase()))
          .slice(0, 5);

        if (localResults.length > 0) {
          searchResults.value = localResults;
        }

        if (props.socket && props.socket.readyState === WebSocket.OPEN) {
          props.socket.send(
            JSON.stringify({
              type: 'emojiSearch',
              searchTerm: term,
            })
          );
        }
      } else {
        searchResults.value = [];
      }
    } else {
      searchTerm.value = null;
      searchResults.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => props.socket,
  (socket, _old, onCleanup) => {
    if (!socket) return;

    const handleEmojiSearchResponse = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'emojiSearchResponse') {
          const serverResults: string[] = data.results || [];

          const localResults = Array.from(props.emojiMap.keys())
            .filter(
              (name) =>
                searchTerm.value && name.toLowerCase().includes(searchTerm.value.toLowerCase())
            )
            .slice(0, 5);

          const combinedResults = [...serverResults];

          localResults.forEach((name) => {
            if (!combinedResults.includes(name)) {
              combinedResults.push(name);
            }
          });

          searchResults.value = combinedResults.slice(0, 10);
          selectedIndex.value = 0;
        }
      } catch (e) {
        console.error('error processing emoji search response:', e);
      }
    };

    socket.addEventListener('message', handleEmojiSearchResponse);
    onCleanup(() => socket.removeEventListener('message', handleEmojiSearchResponse));
  },
  { immediate: true }
);

function handleKeyDown(e: KeyboardEvent) {
  if (!searchTerm.value || searchResults.value.length === 0) return;
  const results = searchResults.value;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % results.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + results.length) % results.length;
      break;
    case 'Enter':
    case 'Tab':
      if (results[selectedIndex.value]) {
        e.preventDefault();
        emit('select', results[selectedIndex.value]!);
      }
      break;
    case 'Escape':
      e.preventDefault();
      searchTerm.value = null;
      searchResults.value = [];
      break;
  }
}

watch(
  () => props.textareaRef,
  (textarea, _old, onCleanup) => {
    if (!textarea) return;
    textarea.addEventListener('keydown', handleKeyDown);
    onCleanup(() => textarea.removeEventListener('keydown', handleKeyDown));
  },
  { immediate: true }
);

watch(selectedIndex, () => {
  const selectedElement = resultsRef.value?.children[selectedIndex.value] as HTMLElement | undefined;
  selectedElement?.scrollIntoView({ block: 'nearest' });
});

interface EmojiSearchProps {
  message: string;
  cursorPosition: number;
  socket: WebSocket | null;
  emojiMap: Map<string, string>;
  textareaRef: HTMLTextAreaElement | null;
}
</script>

<template>
  <div
    v-if="searchTerm && searchResults.length > 0"
    class="absolute bottom-full left-0 right-0 mb-2 mx-0 bg-mantle border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10"
  >
    <div ref="resultsRef" class="py-1">
      <div
        v-for="(emojiName, index) in searchResults"
        :key="emojiName"
        :class="[
          'px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors',
          index === selectedIndex ? 'bg-primary/10' : 'hover:bg-primary/5',
        ]"
        @click="emit('select', emojiName)"
      >
        <img
          v-if="emojiMap.get(emojiName)"
          :src="emojiMap.get(emojiName)"
          :alt="emojiName"
          width="24"
          height="24"
          class="w-6 h-6"
        />
        <span class="flex-grow text-sm font-medium">{{ emojiName }}</span>
        <Check v-if="index === selectedIndex" class="h-4 w-4 text-primary" />
      </div>
    </div>
  </div>
</template>
