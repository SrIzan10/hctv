<script setup lang="ts">
import { ref } from 'vue';
import { Bot } from '@lucide/vue';
import type { BotAccount } from '@hctv/db';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import BotCombobox from '~/components/app/BotCombobox/BotCombobox.vue';
import { runToastAction } from './actions';

const props = defineProps<{
  channelId: string;
  botAccounts: Pick<BotAccount, 'id' | 'displayName' | 'slug' | 'pfpUrl'>[];
  existingBotModerators: string[];
}>();

const open = ref(false);
const selectedBotId = ref('');

function add() {
  void runToastAction(
    'addChatBotModerator',
    { channelId: props.channelId, botId: selectedBotId.value },
    {
      loading: 'Adding bot moderator...',
      success: 'Bot moderator added',
      error: 'Failed to add bot moderator',
    }
  );
  open.value = false;
  selectedBotId.value = '';
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button size="sm" variant="outline">
        <Bot class="h-4 w-4 mr-2" />
        Add Bot Moderator
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add bot moderator</DialogTitle>
        <DialogDescription>
          Look up any bot account by name or slug to grant moderation powers.
        </DialogDescription>
      </DialogHeader>
      <BotCombobox
        :bots="botAccounts"
        :filter="existingBotModerators"
        :value="selectedBotId"
        modal
        @value-change="(value: string) => (selectedBotId = value)"
      />
      <DialogFooter>
        <Button :disabled="!selectedBotId" @click="add">Add Bot</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
