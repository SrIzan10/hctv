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

const props = defineProps<{ channelId: string; existingManagers: string[] }>();

const open = ref(false);
const channel = ref('');

function add() {
  void runToastAction(
    'addChannelManager',
    { channelId: props.channelId, userChannel: channel.value },
    {
      loading: 'Adding manager...',
      success: 'Manager added successfully',
      error: 'Failed to add manager',
    }
  );
  open.value = false;
  channel.value = '';
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button size="sm">
        <UserPlus class="h-4 w-4 mr-2" />
        Add Manager
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add channel manager</DialogTitle>
        <DialogDescription>
          Add a channel manager to help manage your channel during big events or projects.
        </DialogDescription>
      </DialogHeader>
      <UserCombobox
        :filter="existingManagers"
        :value="channel"
        modal
        @value-change="(value: string) => (channel = value)"
      />
      <DialogFooter>
        <Button @click="add">Add Manager</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
