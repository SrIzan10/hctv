'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Channel } from '@hctv/db';

export function ChannelSelect(props: Props) {
  const {
    channelList,
    disabled = false,
    includeCreate = false,
    placeholder = 'Channel',
    triggerClassName,
  } = props;

  return (
    <Select disabled={disabled} onValueChange={props.onSelect} value={props.value}>
      <SelectTrigger className={cn('w-[180px]', triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {channelList.map((channel) => (
          <SelectItem key={channel.id} value={channel.name}>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={channel.pfpUrl} alt={channel.name} />
                <AvatarFallback>{channel.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="font-medium">{channel.name}</div>
            </div>
          </SelectItem>
        ))}
        {includeCreate ? (
          <SelectItem
            key="create"
            value="create"
            icon={<Plus className="h-4 w-4" />}
            className="h-11"
          >
            Create Channel
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

interface Props {
  channelList: Channel[];
  value?: string;
  disabled?: boolean;
  includeCreate?: boolean;
  onSelect: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}
