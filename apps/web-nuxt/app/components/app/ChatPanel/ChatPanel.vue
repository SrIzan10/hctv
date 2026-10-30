<script setup lang="ts">
import { Send } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import Message from './message.vue';
import EmojiSearch from './EmojiSearch.vue';
import type { ChatAccessState, ChatMessage, ChatModerationCommand } from './types';

const props = defineProps<Props>();

const route = useRoute();
const channelName = computed(() => {
  const param = route.params.username;
  return (Array.isArray(param) ? param[0] : param) ?? '';
});
const grant = computed(() => {
  const value = route.query.grant;
  return (Array.isArray(value) ? value[0] : value) ?? null;
});

const message = ref('');
const chatMessages = ref<ChatMessage[]>([]);
const scrollRef = ref<HTMLDivElement | null>(null);
const socketRef = shallowRef<WebSocket | null>(null);
const emojiMap = reactive(new Map<string, string>());
const requestedEmojis = new Set<string>();
const pendingEmojis = ref<string[]>([]);
const cursorPosition = ref(0);
const textareaComponent = ref<{ $el: HTMLTextAreaElement } | null>(null);
const textareaEl = computed(
  () => textareaComponent.value?.$el ?? null
);
const viewer = ref<{ id: string; username: string } | null>(null);
const canModerate = ref(false);
const chatAccess = ref<ChatAccessState>({
  canSend: true,
  restriction: null,
});

function buildSocketUrl() {
  return `ws${window.location.protocol === 'https:' ? 's' : ''}://${
    window.location.host
  }/api/stream/chat/ws/${channelName.value}?grant=${grant.value}`;
}

function flushEmojiRequests(socket: WebSocket | null) {
  if (!socket || socket.readyState !== WebSocket.OPEN || pendingEmojis.value.length === 0) return;

  const emojiRequest = {
    type: 'emojiMsg',
    emojis: pendingEmojis.value.map((e) => e.replaceAll(':', '')),
  };
  console.log('sending emoji request:', emojiRequest);
  socket.send(JSON.stringify(emojiRequest));
  pendingEmojis.value = [];
}

function connect() {
  console.log('Initializing WebSocket connection for user:', channelName.value);
  const socket = new WebSocket(buildSocketUrl());
  socketRef.value = socket;

  socket.onopen = () => {
    console.log('WebSocket connected');
    flushEmojiRequests(socket);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received websocket message:', data);

      if (data.type === 'history') {
        const messages = data.messages as ChatMessage[];
        chatMessages.value = [
          ...chatMessages.value,
          ...messages,
          { message: 'Welcome to the chat!', type: 'systemMsg' },
        ];
        return;
      }

      if (data.type === 'session') {
        viewer.value = data.viewer ?? null;
        canModerate.value = Boolean(data.permissions?.canModerate);
        return;
      }

      if (data.type === 'chatAccess') {
        chatAccess.value = {
          canSend: Boolean(data.canSend),
          restriction: data.restriction ?? null,
        };
        return;
      }

      if (data.type === 'systemMsg') {
        chatMessages.value = [
          ...chatMessages.value,
          { message: data.message, type: 'systemMsg' },
        ];
        return;
      }

      if (data.type === 'messageDeleted') {
        chatMessages.value = chatMessages.value.filter((m) => m.msgId !== data.msgId);
        return;
      }

      if (data.type === 'moderationError') {
        toast.error(data.message || 'Message blocked by moderation rules.');
        return;
      }

      if (data.type === 'emojiMsgResponse') {
        const emojis = (data.emojis ?? {}) as Record<string, string>;
        let validEmojiCount = 0;
        Object.entries(emojis).forEach(([name, url]) => {
          if (url) {
            emojiMap.set(name, url);
            validEmojiCount++;
          } else {
            console.log(`No URL found for emoji: ${name}`);
          }
        });
        if (validEmojiCount > 0) {
          console.log(`added ${validEmojiCount} valid emojis to map.`);
        } else {
          console.warn('No valid emoji URLs received');
        }
        return;
      }

      if (data.type === 'message') {
        console.log('Adding new chat message:', data);
        chatMessages.value = [...chatMessages.value, data];
      }

      if (!data.type && data.message && data.user) {
        console.log('Adding legacy chat message format:', data);
        chatMessages.value = [...chatMessages.value, { ...data, type: 'message' }];
      }
    } catch (e) {
      console.error('Error processing message:', e);
      console.log('Raw message data:', event.data);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket closed');
  };
}

// ping every 5s
useIntervalFn(() => {
  if (socketRef.value && socketRef.value.readyState === WebSocket.OPEN) {
    socketRef.value.send(JSON.stringify({ type: 'ping' }));
  }
}, 5000);

onMounted(() => {
  connect();
});

watch(channelName, (_next, prev) => {
  if (!import.meta.client || !prev) return;
  socketRef.value?.close();
  chatMessages.value = [];
  connect();
});

onBeforeUnmount(() => {
  socketRef.value?.close();
});

watch(
  chatMessages,
  () => {
    if (chatMessages.value.length > 100) {
      chatMessages.value = chatMessages.value.slice(chatMessages.value.length - 100);
    }
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  },
  { flush: 'post' }
);

// emoji message collector
watch(chatMessages, () => {
  if (chatMessages.value.length === 0) return;

  const emojiPattern = /:[\w\-+]+:/g;
  const newEmojis = chatMessages.value
    .filter((msg) => msg.type === 'message')
    .flatMap((msg) => {
      if (!msg.message) return [];
      return [...String(msg.message).matchAll(emojiPattern)].map((m) => m[0]);
    })
    .filter((emoji) => {
      const emojiName = emoji.replaceAll(':', '');
      return emojiName.length > 0 && !emojiMap.has(emojiName) && !requestedEmojis.has(emojiName);
    });

  if (newEmojis.length > 0) {
    console.log(`Found ${newEmojis.length} new emojis to request: ${newEmojis.join(', ')}`);
    newEmojis.forEach((emoji) => requestedEmojis.add(emoji.replaceAll(':', '')));
    pendingEmojis.value = [...new Set([...pendingEmojis.value, ...newEmojis])];
    flushEmojiRequests(socketRef.value);
  }
});

function sendMessage() {
  if (!chatAccess.value.canSend) {
    toast.error(
      chatAccess.value.restriction?.type === 'timeout'
        ? 'You are currently timed out in this chat.'
        : 'You are currently banned from this chat.'
    );
    return;
  }
  if (!message.value.trim()) return;

  const text = message.value;
  if (socketRef.value && socketRef.value.readyState === WebSocket.OPEN) {
    socketRef.value.send(JSON.stringify({ type: 'message', message: text }));
    message.value = '';
  } else {
    const socket = new WebSocket(buildSocketUrl());
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'message', message: text }));
      message.value = '';
    };
  }
}

function sendModerationCommand(command: ChatModerationCommand) {
  if (!socketRef.value || socketRef.value.readyState !== WebSocket.OPEN) {
    toast.error('Chat connection is offline.');
    return;
  }

  socketRef.value.send(JSON.stringify(command));
}

function handleEmojiSelect(emojiName: string) {
  const textarea = textareaEl.value;
  if (!textarea) return;

  const beforeCursor = message.value.substring(0, cursorPosition.value);
  const afterCursor = message.value.substring(cursorPosition.value);

  const match = beforeCursor.match(/:[\w\-+]*$/);
  if (!match) return;

  const startPos = beforeCursor.lastIndexOf(match[0]);
  const newBeforeCursor = beforeCursor.substring(0, startPos);

  message.value = `${newBeforeCursor}:${emojiName}: ${afterCursor}`;

  // 3 for colons and space
  const newCursorPos = newBeforeCursor.length + emojiName.length + 3;

  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = newCursorPos;
    textarea.selectionEnd = newCursorPos;
    cursorPosition.value = newCursorPos;
  }, 0);
}

function isEmojiSearchOpen() {
  const beforeCursor = message.value.substring(0, cursorPosition.value);
  return /:[\w\-+]*$/.test(beforeCursor);
}

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  message.value = target.value;
  cursorPosition.value = target.selectionStart || 0;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !isEmojiSearchOpen()) {
    e.preventDefault();
    sendMessage();
  }
}

function syncCursor(e: Event) {
  cursorPosition.value = (e.currentTarget as HTMLTextAreaElement).selectionStart || 0;
}

interface Props {
  isObsPanel?: boolean;
}
</script>

<template>
  <div
    :class="[
      props.isObsPanel
        ? 'w-full text-white'
        : 'w-full max-w-none md:w-[350px] md:max-w-[350px] md:border-l border-border bg-mantle',
      'flex flex-col h-full min-w-0',
    ]"
  >
    <div
      ref="scrollRef"
      :class="[
        'flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden',
        props.isObsPanel
          ? 'scrollbar-hide'
          : 'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
      ]"
    >
      <div class="space-y-1 min-h-full flex flex-col justify-end">
        <Message
          v-for="(msg, i) in chatMessages"
          :key="i"
          :user="msg.user"
          :message="msg.message"
          :type="msg.type"
          :emoji-map="emojiMap"
          :msg-id="msg.msgId"
          :can-moderate="canModerate && Boolean(viewer?.id)"
          :viewer-id="viewer?.id"
          :channel-name="channelName"
          @moderation-command="sendModerationCommand"
        />
      </div>
    </div>
    <div v-if="!props.isObsPanel" class="p-3 border-t border-border relative">
      <p v-if="!chatAccess.canSend" class="mb-2 text-xs text-destructive">
        {{
          chatAccess.restriction?.type === 'timeout'
            ? `Timed out${chatAccess.restriction.expiresAt ? ` until ${new Date(chatAccess.restriction.expiresAt).toLocaleTimeString()}` : ''}.`
            : 'You are banned from sending messages in this chat.'
        }}
      </p>
      <div class="flex gap-2">
        <Textarea
          ref="textareaComponent"
          :model-value="message"
          placeholder="Send a message..."
          class="flex-1 bg-background/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 min-h-[40px] max-h-[100px] resize-none py-2 text-sm"
          :rows="1"
          :disabled="!chatAccess.canSend"
          @input="onInput"
          @keydown="onKeyDown"
          @keyup="syncCursor"
          @click="syncCursor"
        />
        <Button
          size="icon"
          class="shrink-0 transition-colors"
          :disabled="!message.trim() || !chatAccess.canSend"
          @click="sendMessage"
        >
          <Send class="h-4 w-4" />
        </Button>
      </div>
      <EmojiSearch
        :message="message"
        :cursor-position="cursorPosition"
        :socket="socketRef"
        :emoji-map="emojiMap"
        :textarea-ref="textareaEl"
        @select="handleEmojiSelect"
      />
    </div>
  </div>
</template>
