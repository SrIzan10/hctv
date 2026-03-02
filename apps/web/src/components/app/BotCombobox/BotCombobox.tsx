'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { BotAccount } from '@hctv/db';

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
import { cn } from '@/lib/utils';

export function BotCombobox({ bots, filter, value, modal, onValueChange }: Props) {
  const [open, setOpen] = React.useState(false);

  const selectedBot = bots.find((bot) => bot.id === value);
  const availableBots = bots.filter((bot) => !filter?.includes(bot.id));

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedBot ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={selectedBot.pfpUrl}
                  alt={selectedBot.displayName}
                  loading="lazy"
                  decoding="async"
                />
                <AvatarFallback>{selectedBot.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedBot.displayName}</span>
            </div>
          ) : (
            'Select bot...'
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search bot..." className="h-9" />
          <CommandList>
            <CommandEmpty>No bot found.</CommandEmpty>
            <CommandGroup>
              {availableBots.map((bot) => (
                <CommandItem
                  key={bot.id}
                  value={bot.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={bot.pfpUrl}
                      alt={bot.displayName}
                      loading="lazy"
                      decoding="async"
                    />
                    <AvatarFallback>{bot.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{bot.displayName}</span>
                    <span className="text-xs text-mantle-foreground">@{bot.slug}</span>
                  </div>
                  <Check
                    className={cn('ml-auto', value === bot.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type BotLookupAccount = Pick<BotAccount, 'id' | 'displayName' | 'slug' | 'pfpUrl'>;

type Props = {
  bots: BotLookupAccount[];
  filter?: string[];
  value: string;
  modal?: boolean;
  onValueChange: (value: string) => void;
};
