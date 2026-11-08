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

type BotLookupAccount = { id: string; displayName: string; slug: string; pfpUrl: string };

const props = defineProps<{
  bots: BotLookupAccount[];
  filter?: string[];
  value: string;
  modal?: boolean;
}>();

const emit = defineEmits<{
  valueChange: [value: string];
}>();

const open = ref(false);

const selectedBot = computed(() => props.bots.find((bot) => bot.id === props.value));
const availableBots = computed(() => props.bots.filter((bot) => !props.filter?.includes(bot.id)));
</script>

<template>
  <Popover v-model:open="open" :modal="modal">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between"
      >
        <div v-if="selectedBot" class="flex items-center gap-2 overflow-hidden">
          <Avatar class="h-8 w-8 shrink-0">
            <AvatarImage :src="selectedBot.pfpUrl" :alt="selectedBot.displayName" />
            <AvatarFallback>{{ selectedBot.displayName[0]?.toUpperCase() }}</AvatarFallback>
          </Avatar>
          <span class="truncate">{{ selectedBot.displayName }}</span>
        </div>
        <template v-else>Select bot...</template>
        <ChevronsUpDown class="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[var(--reka-popover-trigger-width)] p-0">
      <Command>
        <CommandInput placeholder="Search bot..." class="h-9" />
        <CommandList>
          <CommandEmpty>No bot found.</CommandEmpty>
          <CommandGroup>
            <!-- the item text (display name + @slug) is what the search filters on -->
            <CommandItem
              v-for="bot in availableBots"
              :key="bot.id"
              :value="bot.id"
              @select="
                () => {
                  emit('valueChange', bot.id === value ? '' : bot.id);
                  open = false;
                }
              "
            >
              <Avatar class="h-8 w-8">
                <AvatarImage :src="bot.pfpUrl" :alt="bot.displayName" />
                <AvatarFallback>{{ bot.displayName[0]?.toUpperCase() }}</AvatarFallback>
              </Avatar>
              <div class="flex flex-col">
                <span>{{ bot.displayName }}</span>
                <span class="text-xs text-mantle-foreground">@{{ bot.slug }}</span>
              </div>
              <Check :class="cn('ml-auto', value === bot.id ? 'opacity-100' : 'opacity-0')" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
