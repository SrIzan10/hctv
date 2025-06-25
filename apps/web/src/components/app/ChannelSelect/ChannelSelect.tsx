'use client'

import type { Channel } from "@hctv/db";
import * as React from 'react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function ChannelSelect(props: Props) {
  const { channelList } = props;
  return (
    <Select onValueChange={props.onSelect} value={props.value}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Channel" />
      </SelectTrigger>
      <SelectContent>
        {channelList.map((channel) => (
          <SelectItem key={channel.id} value={channel.name}>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={channel.pfpUrl} alt={channel.name} />
                <AvatarFallback>{channel.name[0]}</AvatarFallback>
              </Avatar>
              <div className="font-medium">{channel.name}</div>
            </div>
          </SelectItem>
        ))}
        <SelectItem key="create" value="create" icon={<Plus className="h-4 w-4" />} className='h-11'>
          Create Channel
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

interface Props {
  channelList: Channel[];
  value?: string;
  onSelect: (value: string) => void;
}