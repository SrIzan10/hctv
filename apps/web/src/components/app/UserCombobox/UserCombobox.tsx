'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
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
import useSWR from 'swr';
import { fetcher } from '@/lib/services/swr';
import { Channel, StreamInfo } from '@hctv/db';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserCombobox(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState('');
  
  // Use external value if provided, otherwise use internal state
  const value = props.value ?? internalValue;
  const setValue = props.onValueChange ?? setInternalValue;
  const {
    data: fetchedUsers,
    error,
    isLoading,
  } = useSWR<APIResponse>(
    props.users ? null : '/api/stream/info?personal=true', 
    fetcher
  );

  const users = props.users || fetchedUsers;

  if (!props.users && error) return <div>Error loading users</div>;
  if (!props.users && isLoading) return <div>Loading...</div>;
  return (
    <Popover open={open} onOpenChange={setOpen} modal={props.modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? (
              <div className='flex items-center gap-2'>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={users?.find((user) => user.username === value)?.channel.pfpUrl} alt={value} />
                  <AvatarFallback>{value[0]}</AvatarFallback>
                </Avatar>
                <span>{users?.find((user) => user.username === value)?.username}</span>
              </div>
            )
            : 'Select user...'}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search user..." className="h-9" />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {users?.filter(user => !props.filter?.some(filterStr => user.userId === filterStr)).map((user) => (
                <CommandItem
                  key={user.channelId}
                  value={user.username}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.channel.pfpUrl} alt={user.username} />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  {user.username}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === user.username ? 'opacity-100' : 'opacity-0'
                    )}
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

type APIResponse = (StreamInfo & { channel: Channel })[];
type Props = {
  users?: APIResponse;
  value?: string;
  filter?: string[];
  modal?: boolean;
  onValueChange?: (value: string) => void;
}