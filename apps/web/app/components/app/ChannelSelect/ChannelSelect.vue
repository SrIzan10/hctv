<script setup lang="ts">
import { Plus } from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '~/lib/utils';

type SelectableChannel = { id: string; name: string; pfpUrl: string };

const props = withDefaults(
  defineProps<{
    channelList: SelectableChannel[];
    value?: string;
    disabled?: boolean;
    includeCreate?: boolean;
    placeholder?: string;
    triggerClassName?: string;
  }>(),
  { disabled: false, includeCreate: false, placeholder: 'Channel' }
);

const emit = defineEmits<{
  select: [value: string];
}>();

const selectedChannel = computed(() => props.channelList.find((c) => c.name === props.value));
</script>

<template>
  <Select
    :disabled="disabled"
    :model-value="value"
    @update:model-value="(v) => emit('select', String(v))"
  >
    <SelectTrigger :class="cn('w-[180px]', triggerClassName)">
      <!-- reka's SelectValue only copies the item's textContent (the avatar fallback letter would be
           glued to the name), so render the selected channel explicitly like radix did -->
      <SelectValue :placeholder="placeholder">
        <template v-if="selectedChannel">
          <Avatar class="size-6">
            <AvatarImage :src="selectedChannel.pfpUrl" :alt="selectedChannel.name" />
            <AvatarFallback>{{ selectedChannel.name[0]?.toUpperCase() }}</AvatarFallback>
          </Avatar>
          <span class="font-medium">{{ selectedChannel.name }}</span>
        </template>
        <template v-else-if="value === 'create'">Create Channel</template>
        <template v-else>{{ placeholder }}</template>
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="channel in channelList" :key="channel.id" :value="channel.name">
        <div class="flex items-center gap-3">
          <Avatar class="h-8 w-8">
            <AvatarImage :src="channel.pfpUrl" :alt="channel.name" />
            <AvatarFallback>{{ channel.name[0]?.toUpperCase() }}</AvatarFallback>
          </Avatar>
          <div class="font-medium">{{ channel.name }}</div>
        </div>
      </SelectItem>
      <SelectItem v-if="includeCreate" key="create" value="create" class="h-11">
        <Plus class="h-4 w-4" />
        Create Channel
      </SelectItem>
    </SelectContent>
  </Select>
</template>
