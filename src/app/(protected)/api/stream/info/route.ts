import { validateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shouldGetOwned = searchParams.get('owned') === 'true';
  const { user } = await validateRequest();
  /* const db = await prisma.streamInfo.findMany({
    include: { ownedBy: true },
  }); */

  if (shouldGetOwned) {
    if (!user) {
      return new Response('No user found in cookies', { status: 401 });
    }
    
    const db = await prisma.channel.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { managers: { some: { id: user.id } } },
        ]
      },
      include: {
        streamInfo: true,
      }
    });
    return Response.json(db.map((channel) => channel.streamInfo)[0]);
  } else {
    const db = await prisma.streamInfo.findMany({
      include: {
        channel: true,
      }
    });
    return Response.json(db);
  }
}
