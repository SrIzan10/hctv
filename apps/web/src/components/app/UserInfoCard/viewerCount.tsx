import { useStreams } from "@/lib/providers/StreamInfoProvider";
import { User } from "lucide-react";
import { useParams } from "next/navigation";

export default function ViewerCount() {
  const streamInfo = useStreams();
  const { username } = useParams();

  if (streamInfo.isLoading) return null;

  const viewerCount = streamInfo.stream!.find(s => s.username === username)?.viewers;

  return (
    <div className="flex items-center space-x-2 *:text-destructive">
      <span className="text-sm font-semibold"><User /></span>
      <span className="text-sm">{viewerCount}</span>
    </div>
  );
}