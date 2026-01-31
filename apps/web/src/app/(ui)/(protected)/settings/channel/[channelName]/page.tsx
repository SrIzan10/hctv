import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { redirect } from 'next/navigation';
import ChannelSettingsClient from './page.client';
import { resolvePersonalChannel } from '@/lib/auth/resolve';
import { can } from '@/lib/auth/abac';

export default async function ChannelSettingsPage({
  params,
}: {
  params: Promise<{ channelName: string }>;
}) {
  const { channelName } = await params;
  const { user } = await validateRequest();

  if (!user) {
    redirect('/auth/hackclub');
  }

  const channel = await prisma.channel.findUnique({
    where: { name: channelName },
    include: {
      owner: true,
      managers: true,
      streamInfo: true,
      streamKey: true,
      followers: {
        include: {
          user: {
            select: {
              id: true,
              slack_id: true,
            },
          },
        },
      },
      personalFor: true,
    },
  });

  if (!channel) {
    redirect('/');
  }

  const isOwner = channel.ownerId === user.id;

  if (!can(user, 'update', 'channel', { channel })) {
    redirect('/');
  }

  const ownerPersonalChannel = await resolvePersonalChannel(channel.ownerId);
  const managerPersonalChannels = await Promise.all(
    channel.managers.map((manager) => resolvePersonalChannel(manager.id))
  );
  const followerPersonalChannels = await Promise.all(
    channel.followers.map((follower) => resolvePersonalChannel(follower.user.id))
  );

  return (
    <ChannelSettingsClient
      channel={{
        ...channel,
        ownerPersonalChannel,
        managerPersonalChannels,
        followerPersonalChannels,
      }}
      isOwner={isOwner}
      currentUser={user}
      isPersonal={channel.personalFor !== null}
    />
  );
}
