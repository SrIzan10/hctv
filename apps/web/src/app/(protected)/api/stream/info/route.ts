import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
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
    
    const db = await prisma.streamInfo.findMany({
      where: {
        channel: {
          ownerId: user.id,
        },
      },
    });
    return Response.json(db);
  } else {
    const db = await prisma.streamInfo.findMany({
      include: {
        channel: true,
      }
    });
    return Response.json(db);
  }
}
