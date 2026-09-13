import { Avatar, AvatarImage } from '@/components/ui/avatar';
import type { StreamInfo, Channel } from '@hctv/db';
import FollowButton from './follow';
import FollowCountText from './followCount';
import StreamUptime from './streamUptime';
import ViewerCount from './viewerCount';
import { Preview } from '@/components/ui/channel-desc-fancy-area/preview';

export default function UserInfoCard(props: Props) {
  return (
    <div className="bg-mantle p-3 md:p-4 border-b shrink-0 flex flex-col gap-3 md:h-48">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 flex-shrink-0">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Avatar className="h-12 w-12 md:h-16 md:w-16 shrink-0">
            <AvatarImage src={props.streamInfo.channel.pfpUrl} alt={props.streamInfo.username} />
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight md:text-2xl">
              {props.streamInfo.title}
            </h1>
            <p className="truncate text-sm text-muted-foreground md:text-foreground">
              {props.streamInfo.username}
            </p>
            <FollowCountText channel={props.streamInfo.username} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-4">
          <ViewerCount />
          <StreamUptime />
          <FollowButton channel={props.streamInfo.username} />
        </div>
      </div>
      <div className="max-h-20 overflow-y-auto md:max-h-32">
        <Preview textValue={props.streamInfo.channel.description} />
      </div>
    </div>
  );
}

interface Props {
  streamInfo: StreamInfo & { channel: Channel };
}
