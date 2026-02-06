import LiveStream from "@/components/app/Livestream/Livestream";
import { prisma } from '@hctv/db';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const streamInfo = await prisma.streamInfo.findUnique({
    where: { username },
    include: {
      channel: {
        include: {
          restriction: true,
        },
      },
    },
  });
  if (!streamInfo) {
    return <div>Stream not found</div>;
  }

  if (streamInfo.channel.restriction) {
    const isExpired = streamInfo.channel.restriction.expiresAt &&
      new Date(streamInfo.channel.restriction.expiresAt) < new Date();
    
    if (!isExpired) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
          <h1 className="text-2xl font-bold text-destructive mb-2">Channel Restricted</h1>
          <p className="text-muted-foreground text-center max-w-md">
            This channel has been restricted by a moderator and is not currently available for viewing.
          </p>
        </div>
      );
    }
  }

  return (
    <LiveStream username={username} streamInfo={streamInfo} />
  );
}
