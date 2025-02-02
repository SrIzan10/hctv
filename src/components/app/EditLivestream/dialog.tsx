'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StreamInfo } from '@prisma/client';
import { UniversalForm } from '../UniversalForm/UniversalForm';
import { editStreamInfo } from '@/lib/form/actions';
import RegenerateKey from '../RegenerateKey/RegenerateKey';
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Channel } from '@prisma/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useSWR, { Fetcher } from 'swr';
import { fetcher } from '@/lib/services/swr';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditLivestreamDialog(props: Props) {
  const [selectedChannel, setSelectedChannel] = React.useState('');
  const [streamInfo, setStreamInfo] = React.useState<StreamInfo>();

  // Fix the useSWR implementation
  const { data, error } = useSWR(selectedChannel ? '/api/stream/info?owned=true' : null, fetcher as Fetcher<StreamInfo[]>);

  React.useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  React.useEffect(() => {
    if (data && selectedChannel) {
      console.log('data', data)
      const stream = data.find((stream) => stream.username === selectedChannel);
      setStreamInfo(stream);
    }
  }, [data, selectedChannel]);

  // debug consome log selectedChannel
  React.useEffect(() => {
    console.log(selectedChannel);
  }, [selectedChannel]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Livestream</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit livestream</DialogTitle>
          <DialogDescription>Regenerate a key or edit your stream metadata</DialogDescription>
        </DialogHeader>
        <ChannelSelect channelList={props.ownedChannels} onSelect={setSelectedChannel} />
        {streamInfo && data ? (
          <Form username={selectedChannel} streamInfo={streamInfo} />
        ) : (
          <FormSkeleton />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Form(props: FormProps) {
  return (
    <UniversalForm
      fields={[
        { name: 'username', label: 'Username', value: props.username, type: 'hidden' },
        { name: 'title', label: 'Title', type: 'text', value: props.streamInfo?.title },
        { name: 'category', label: 'Category', type: 'text', value: props.streamInfo?.category },
      ]}
      schemaName="streamInfoEdit"
      action={editStreamInfo}
      submitButtonDivClassname="float-right"
      submitText="Save"
      otherSubmitButton={<RegenerateKey channel={props.username} />}
      key={props.streamInfo?.id}
    />
  );
}
function FormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Title field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>

      {/* Category field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>

      {/* Buttons */}
      <div className="float-right flex gap-2 py-2">
        <Skeleton className="h-10 w-32" /> {/* RegenerateKey button */}
        <Skeleton className="h-10 w-24" /> {/* Save button */}
      </div>
    </div>
  );
}

export function ChannelSelect(props: SelectProps) {
  const { channelList } = props;
  return (
    <Select onValueChange={props.onSelect}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Theme" />
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
      </SelectContent>
    </Select>
  );
}

interface Props {
  ownedChannels: Channel[];
}
interface FormProps {
  username: string;
  streamInfo: StreamInfo;
}
interface SelectProps {
  channelList: Channel[];
  onSelect: (value: string) => void;
}
