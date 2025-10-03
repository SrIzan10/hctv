import { CalendarDays } from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import { useAllChannels } from "@/lib/hooks/useUserList";

interface Props {
  children: React.ReactNode;
  handle: string;
}

export function Mention({ children, handle }: Props) {
  const { channels, isLoading, error } = useAllChannels();
  
  if (isLoading) return null;
  if (error) {
    console.error("Error fetching channels:", error);
    return null;
  }

  const isString = typeof children === "string";
  // REMINDER: children has other children - return early
  if (!isString) {
    return children;
  }

  // Find channel by name (handle without @)
  const channel = channels.find((ch) => ch.username.toLowerCase() === handle.toLowerCase());
  // REMINDER: only allowed users are rendered with HoverCard
  if (!channel) {
    return children;
  }

  const fallback = handle.substring(0, 2).toUpperCase();
  const url = `https://hackclub.tv/${handle}`;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href={url} target="_blank">
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent className="max-w-xs w-auto">
          <div className="flex justify-between space-x-4">
            <Avatar>
              <AvatarImage src={channel.channel.pfpUrl} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{channel.channel.name}</h4>
              <p className="text-sm">{channel.channel.description}</p>
              <div className="flex items-center pt-2">
                <CalendarDays className="mr-2 h-4 w-4 opacity-70" />{" "}
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(channel.channel.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}
