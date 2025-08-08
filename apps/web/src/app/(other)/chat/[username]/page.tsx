import ChatPanel from "@/components/app/ChatPanel/ChatPanel";
import LiveStream from "@/components/app/Livestream/Livestream";
import { prisma } from '@hctv/db';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const streamInfo = await prisma.streamInfo.findUnique({
    where: { username },
    include: { channel: true },
  });
  if (!streamInfo) {
    return <div>Stream not found</div>;
  }
  return (
    <ChatPanel isObsPanel />
  );
}
