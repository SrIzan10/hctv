import { prisma } from '@hctv/db';
import { HttpFlv } from '../types/liveBackendJson';
import { getNotificationQueue } from '../workers';
import client from '../services/slackNotifier';
import type { paths } from '../types/mediamtx.d.ts';
import { MEDIAMTX_SERVER_REGIONS } from '../utils/mediamtx/server';

export default async function runner() {
  // if there are no users it explodes so yeah
  if ((await prisma.user.count()) === 0) {
    return;
  }
  await initializeStreamInfo();
  await syncStream();
  setInterval(syncStream, 5000);
}

export async function initializeStreamInfo(channelId?: string) {
  const channels = await prisma.channel.findMany({
    where: {
      id: channelId,
    },
    include: {
      streamInfo: true,
    },
  });

  for (const channel of channels) {
    if (!channel.streamInfo.length) {
      await prisma.streamInfo.create({
        data: {
          username: channel.name,
          title: 'Untitled',
          category: 'Uncategorized',
          startedAt: new Date(0),
          thumbnail: 'https://picsum.photos/600/400',
          viewers: 0,
          isLive: false,
          channel: {
            connect: { id: channel.id },
          },
          ownedBy: {
            connect: { id: channel.ownerId },
          },
        },
      });
    }
  }
}

export async function syncStream() {
  try {
    const regions = Object.keys(MEDIAMTX_SERVER_REGIONS) as Array<
      keyof typeof MEDIAMTX_SERVER_REGIONS
    >;

    const allActiveStreams = new Map<string, keyof typeof MEDIAMTX_SERVER_REGIONS>();

    for (const r of regions) {
      const region = MEDIAMTX_SERVER_REGIONS[r];
      const response = await fetch(`${region.apiUrl}/v3/paths/list?itemsPerPage=1000`);

      if (!response.ok) {
        console.error(
          `Failed to fetch ${r} stream stats: ${response.status} ${response.statusText}`
        );
        continue;
      }

      type ResponseType =
        paths['/v3/paths/list']['get']['responses']['200']['content']['application/json'];
      const data = (await response.json()) as ResponseType;

      if (data?.items) {
        for (const stream of data.items) {
          if (stream.ready && stream.name) {
            allActiveStreams.set(stream.name, r);
          }
        }
      }
    }

    // handle streams going offline
    const currentLiveStreams = await prisma.streamInfo.findMany({
      where: { isLive: true },
    });

    for (const dbStream of currentLiveStreams) {
      if (!allActiveStreams.has(dbStream.username)) {
        await prisma.streamInfo.update({
          where: { username: dbStream.username },
          data: {
            isLive: false,
            viewers: 0,
            startedAt: new Date(0),
          },
        });
      }
    }

    // handle streams going online
    for (const [username, regionKey] of allActiveStreams) {
      const existingStream = await prisma.streamInfo.findUnique({
        where: { username },
        include: { channel: true },
      });

      if (existingStream && !existingStream.isLive) {
        console.log(`Stream ${username} is now live in region ${regionKey}`);
        await prisma.streamInfo.update({
          where: { username },
          data: {
            isLive: true,
            startedAt: new Date(),
            streamRegion: regionKey,
          },
        });

        const subscribedFollowers = await prisma.follow.findMany({
          where: {
            channelId: existingStream.channelId,
            notifyStream: true,
          },
          include: {
            user: true,
          },
        });

        const queue = getNotificationQueue();

        if (!existingStream.channel.is247) {
          queue.add(`streamStartChannel:${existingStream.username}`, {
            text: `${existingStream.username} is now *live*, streaming *${existingStream.title}* (${existingStream.category})!\n<https://hackclub.tv/${existingStream.username}|Go check them out>`,
            channel: process.env.NOTIFICATION_CHANNEL_ID!,
            unfurl_links: true,
          });
        }

        if (existingStream.enableNotifications && !existingStream.channel.is247) {
          for (const follower of subscribedFollowers) {
            queue.add(`streamStartDm:${follower.user.id}`, {
              text: `${existingStream.username} is now *live*, streaming *${existingStream.title}* (${existingStream.category})!\n<https://hackclub.tv/${existingStream.username}|Go check them out>\n_Stream notifications are enabled for this user. If you want to disable them, you can do so in \`Profile > Follows\`._`,
              channel: follower.user.slack_id,
              unfurl_links: true,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error syncing stream status:', error);
  }
}
