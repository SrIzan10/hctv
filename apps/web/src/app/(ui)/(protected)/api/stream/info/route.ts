// FIXME: THIS EFFING SUCKS OH MY GOD

import { validateRequest } from '@/lib/auth/validate';
import { Prisma, prisma } from '@hctv/db';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shouldGetOwned = searchParams.get('owned') === 'true';
  const allPersonalChannels = searchParams.get('personal') === 'true';
  const isLive = searchParams.get('live') === 'true';
  const { user } = await validateRequest();

  if ((shouldGetOwned || allPersonalChannels) && !user) {
    return new Response('No user found in cookies', { status: 401 });
  }

  const where: Prisma.StreamInfoWhereInput = {};
  const channelConditions: Prisma.ChannelWhereInput[] = [];

  if (shouldGetOwned && user) {
    channelConditions.push({ ownerId: user.id });
  }

  if (allPersonalChannels) {
    channelConditions.push({ 
      personalFor: { 
        isNot: null 
      } 
    });
  }

  if (isLive) {
    where.isLive = true;
  }

  if (channelConditions.length > 0) {
    where.channel = channelConditions.length === 1 
      ? channelConditions[0]
      : { OR: channelConditions };
  }

  const db = await prisma.streamInfo.findMany({
    where,
    include: {
      channel: {
        include: {
          personalFor: true,
        }
      },
    },
  });

  db.forEach((obj) => {
    if (obj.channel.personalFor) {
      // @ts-ignore
      delete obj.channel.personalFor.email;
    }
    // @ts-ignore
    delete obj.channel.obsChatGrantToken;
  });

  return Response.json(db);
}