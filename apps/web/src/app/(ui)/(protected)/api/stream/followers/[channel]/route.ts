import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hctv/db';
import { resolveChannelNameId } from '@/lib/db/resolve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params;

    if (!channel) {
      return NextResponse.json({ error: 'channel ID is required' }, { status: 400 });
    }

    const channelId = await resolveChannelNameId(channel);

    const count = await prisma.follow.count({
      where: {
        channelId,
      },
    });

    return NextResponse.json({
      count,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching followers count:', error);
    return NextResponse.json({ error: 'Failed to fetch followers count' }, { status: 500 });
  }
}
