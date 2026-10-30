<script setup lang="ts">
import { Check, ChevronsUpDown } from '@lucide/vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '~/lib/utils';

const props = defineProps<{
  users?: StreamInfoResponse;
  value?: string;
  filter?: string[];
  modal?: boolean;
}>();

const emit = defineEmits<{
  valueChange: [value: string];
}>();

const open = ref(false);
const internalValue = ref('');

// external value if provided, otherwise internal state
const value = computed(() => props.value ?? internalValue.value);
function setValue(next: string) {
  if (props.value === undefined) internalValue.value = next;
  emit('valueChange', next);
}

const {
  data: fetchedUsers,
  error,
  status,
} = useFetch<StreamInfoResponse>('/api/stream/info?personal=true', {
  key: 'user-combobox-personal',
  immediate: !props.users,
  lazy: true,
});

const users = computed(() => props.users || fetchedUsers.value || undefined);
const selectedUser = computed(() => users.value?.find((user) => user.username === value.value));
const visibleUsers = computed(() =>
  (users.value ?? []).filter((user) => !props.filter?.some((filterStr) => user.userId === filterStr))
);
</script>

<template>
  <div v-if="!users && error">Error loading users</div>
  <div v-else-if="!users && status === 'pending'">Loading...</div>
  <Popover v-else v-model:open="open" :modal="modal">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-[200px] justify-between"
      >
        <div v-if="value" class="flex items-center gap-2">
          <Avatar class="h-8 w-8">
            <AvatarImage :src="selectedUser?.channel.pfpUrl ?? ''" :alt="value" />
            <AvatarFallback>{{ value[0] }}</AvatarFallback>
          </Avatar>
          <span>{{ selectedUser?.username }}</span>
        </div>
        <template v-else>Select user...</template>
        <ChevronsUpDown class="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[200px] p-0">
      <Command>
        <CommandInput placeholder="Search user..." class="h-9" />
        <CommandList>
          <CommandEmpty>No user found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="user in visibleUsers"
              :key="user.channelId"
              :value="user.username"
              @select="
                () => {
                  setValue(user.username === value ? '' : user.username);
                  open = false;
                }
              "
            >
              <Avatar class="h-8 w-8">
                <AvatarImage :src="user.channel.pfpUrl" :alt="user.username" />
                <AvatarFallback>{{ user.username[0] }}</AvatarFallback>
              </Avatar>
              {{ user.username }}
              <Check :class="cn('ml-auto', value === user.username ? 'opacity-100' : 'opacity-0')" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
