'use server'
import db from '@/lib/db';

export async function resolveChannelNameId(channelName: string) {
  const channel = await db.channel.findUnique({
    where: {
      name: channelName,
    },
  });

  if (!channel) {
    return '';
  }

  return channel.id;
}