import ChatPanel from "@/components/app/ChatPanel/ChatPanel";
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
    <div className="bg-green-500 h-screen">
      <ChatPanel isObsPanel />
    </div>
  );
}
