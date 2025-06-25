"use client";

import { cn } from "@/lib/utils";
import { useProcessor } from "./use-processor";

interface Props {
  textValue: string;
  className?: string;
}

export function Preview({ textValue, className }: Props) {
  const Component = useProcessor(textValue);
  return (
    <div className={cn("w-full overflow-auto prose dark:prose-invert prose-sm px-1 border border-transparent prose-headings:font-cal", className)}> 
      {Component}
    </div>
  );
}
