import { cn } from "@/lib/utils";
import { ChatMessage } from "./ChatPanel";

export function Message({ user, message, type }: ChatMessage) {
  return (
    <div className="flex">
      <div
        lang="en"
        className={cn("max-w-full break-all whitespace-pre-wrap hyphens-auto", type === "systemMsg" ? "text-muted-foreground" : "")}
      >
        <p>
          <span className="font-bold mr-2">{user?.username}</span>
          <span>{message}</span>
        </p>
      </div>
    </div>
  );
}