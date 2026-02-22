import { Avatar, AvatarImage } from '@/components/ui/avatar';
import type { StreamInfo, Channel } from '@hctv/db';
import FollowButton from './follow';
import FollowCountText from './followCount';
import StreamUptime from './streamUptime';
import ViewerCount from './viewerCount';
import { Preview } from '@/components/ui/channel-desc-fancy-area/preview';

export default function UserInfoCard(props: Props) {
  return (
    <div className="bg-mantle p-4 border-b h-48 flex flex-col">
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={props.streamInfo.channel.pfpUrl} alt={props.streamInfo.username} />
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{props.streamInfo.title}</h1>
            <p>{props.streamInfo.username}</p>
            <FollowCountText channel={props.streamInfo.username} />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <ViewerCount />
          <StreamUptime />
          <FollowButton channel={props.streamInfo.username} />
        </div>
      </div>
      <div className="max-h-32 overflow-y-auto">
        <Preview textValue={props.streamInfo.channel.description} />
      </div>
    </div>
  );
}

interface Props {
  streamInfo: StreamInfo & { channel: Channel };
}
