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
import { StreamInfo } from '@hctv/db';
import { UniversalForm } from '../UniversalForm/UniversalForm';
import { editStreamInfo } from '@/lib/form/actions';
import RegenerateKey from '../RegenerateKey/RegenerateKey';
import * as React from 'react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Channel } from '@hctv/db';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useSWR, { Fetcher } from 'swr';
import { fetcher } from '@/lib/services/swr';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditLivestreamDialog(props: Props) {
  const [selectedChannel, setSelectedChannel] = React.useState('');
  const [streamInfo, setStreamInfo] = React.useState<StreamInfo>();
  const router = useRouter();

  const { data, error } = useSWR(
    selectedChannel ? '/api/stream/info?owned=true' : null,
    fetcher as Fetcher<StreamInfo[]>
  );

  React.useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  React.useEffect(() => {
    if (data && selectedChannel) {
      const stream = data.find((stream) => stream.username === selectedChannel);
      setStreamInfo(stream);
    }
  }, [data, selectedChannel]);

  React.useEffect(() => {
    if (props.ownedChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(props.ownedChannels[0].name);
    }
  }, [props.ownedChannels, selectedChannel]);

  React.useEffect(() => {
    if (selectedChannel === 'create') {
      setSelectedChannel('');
      // using window location href as a really janky way to just close the dialog
      // TODO: use a proper dialog close method
      window.location.href = '/settings/channel/create';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  return (
    <Dialog
      onOpenChange={(op) => {
        if (op) {
          setSelectedChannel('');
          setStreamInfo(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Edit Livestream</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit livestream</DialogTitle>
          <DialogDescription>Regenerate a key or edit your stream metadata</DialogDescription>
        </DialogHeader>
        <Link
          href="https://gist.github.com/SrIzan10/ebd89ced6b21b016d4d389e6711a94e9"
          target="_blank"
        >
          HOW TO STREAM (github gist link)
        </Link>
        <ChannelSelect
          channelList={props.ownedChannels}
          onSelect={setSelectedChannel}
          value={selectedChannel}
        />
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
        {
          name: 'enableNotifications',
          label: 'Enable livestream notifications',
          type: 'hidden',
          value: props.streamInfo?.enableNotifications,
        },
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
  ownedChannels: Channel[];
}
interface FormProps {
  username: string;
  streamInfo: StreamInfo;
}
interface SelectProps {
  channelList: Channel[];
  value?: string;
  onSelect: (value: string) => void;
}
