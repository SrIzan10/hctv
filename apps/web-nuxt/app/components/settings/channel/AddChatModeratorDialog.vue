<script setup lang="ts">
import { ref } from 'vue';
import { UserPlus } from '@lucide/vue';
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
import UserCombobox from '~/components/app/UserCombobox/UserCombobox.vue';
import { runToastAction } from './actions';

const props = defineProps<{ channelId: string; existingModerators: string[] }>();

const open = ref(false);
const selectedChannel = ref('');

function add() {
  void runToastAction(
    'addChatModerator',
    { channelId: props.channelId, userChannel: selectedChannel.value },
    { loading: 'Adding moderator...', success: 'Moderator added', error: 'Failed to add moderator' }
  );
  open.value = false;
  selectedChannel.value = '';
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button size="sm" variant="outline">
        <UserPlus class="h-4 w-4 mr-2" />
        Add User Moderator
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add chat moderator</DialogTitle>
        <DialogDescription>
          Choose a user who should be able to moderate this channel's chat.
        </DialogDescription>
      </DialogHeader>
      <UserCombobox
        :filter="existingModerators"
        :value="selectedChannel"
        modal
        @value-change="(value: string) => (selectedChannel = value)"
      />
      <DialogFooter>
        <Button :disabled="!selectedChannel" @click="add">Add Moderator</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
