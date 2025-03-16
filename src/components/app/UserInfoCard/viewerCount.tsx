import { useStreams } from "@/lib/providers/StreamInfoProvider";
import { User } from "lucide-react";

export default function ViewerCount() {
  const streamInfo = useStreams();

  if (streamInfo.isLoading) return null;

  const viewerCount = streamInfo.stream!.reduce((acc, stream) => acc + stream.viewers, 0);

  return (
    <div className="flex items-center space-x-2 *:text-destructive">
      <span className="text-sm font-semibold"><User /></span>
      <span className="text-sm">{viewerCount}</span>
    </div>
  );
}