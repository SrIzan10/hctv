import { Avatar, AvatarImage } from '@/components/ui/avatar';
import type { StreamInfo, Channel } from '@hctv/db';
import FollowButton from './follow';
import FollowCountText from './followCount';
import ViewerCount from './viewerCount';

export default function UserInfoCard(props: Props) {
  return (
    <div className="bg-mantle p-4 border-b">
      <div className="flex items-start justify-between mb-4">
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
          <FollowButton channel={props.streamInfo.username} />
        </div>
      </div>
      <p className="mb-4">markdown description here</p>
    </div>
  );
}

interface Props {
  streamInfo: StreamInfo & { channel: Channel };
}