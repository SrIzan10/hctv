import LiveStream from "@/components/app/Livestream/Livestream";
import prisma from '@hctv/db';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const streamInfo = await prisma.streamInfo.findUnique({
    where: { username },
    include: { ownedBy: true },
  });
  if (!streamInfo) {
    return <div>Stream not found</div>;
  }
  return (
    <LiveStream username={username} streamInfo={streamInfo} />
  );
}
