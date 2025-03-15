import { Avatar, AvatarImage } from '@/components/ui/avatar';
import type { StreamInfo, User } from '@prisma/client';
import FollowButton from './follow';
import FollowCountText from './followCount';

export default function UserInfoCard(props: Props) {
  return (
    <div className="bg-mantle p-4 border-b">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={props.streamInfo.ownedBy.pfpUrl} alt={props.streamInfo.username} />
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{props.streamInfo.title}</h1>
            <p>{props.streamInfo.username}</p>
            <FollowCountText channel={props.streamInfo.username} />
          </div>
        </div>
        <FollowButton channel={props.streamInfo.username} />
      </div>
      <p className="mb-4">markdown description here</p>
      {/* <div className="flex items-center space-x-4 text-gray-400">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          <span>1.2K viewers</span>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Heart className="h-5 w-5 mr-2" />
          Like
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Share2 className="h-5 w-5 mr-2" />
          Share
        </Button>
      </div> */}
    </div>
  );
}

interface Props {
  streamInfo: StreamInfo & { ownedBy: User };
}