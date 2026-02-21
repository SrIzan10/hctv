'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ConfusedDino from '@/components/ui/confuseddino';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { Channel, StreamInfo } from '@hctv/db';

type StreamWithChannel = StreamInfo & { channel: Channel };

interface StreamGridProps {
  liveStreams: StreamWithChannel[];
  offlineStreams: StreamWithChannel[];
}

export default function StreamGrid({ liveStreams, offlineStreams }: StreamGridProps) {
  const sortedLiveStreams = [...liveStreams].sort((a, b) => b.viewers - a.viewers);

  return (
    <div className="space-y-8 md:space-y-10">
      {sortedLiveStreams.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <ConfusedDino className="h-24 w-24 opacity-70" />
          <div className="space-y-1">
            <p className="font-semibold">Nobody&apos;s live right now</p>
            <p className="text-sm text-muted-foreground">Why not be the first?</p>
          </div>
          <Link
            href="/settings/channel"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Start streaming
          </Link>
        </div>
      )}

      {sortedLiveStreams.length > 0 && (
        <section>
          <SectionHeading label="Live now" count={sortedLiveStreams.length} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {sortedLiveStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {offlineStreams.length > 0 && (
        <section>
          <SectionHeading label="Offline channels" count={offlineStreams.length} />
          <div className="relative">
            <Carousel opts={{ align: 'start', dragFree: true }}>
              <CarouselContent>
                {offlineStreams.map((stream) => (
                  <CarouselItem
                    key={stream.id}
                    className="flex basis-[74px] justify-center sm:basis-[82px] md:basis-[90px] lg:basis-[100px]"
                  >
                    <OfflineCard stream={stream} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </section>
      )}
    </div>
  );
}

function StreamCard({ stream }: { stream: StreamWithChannel }) {
  return (
    <Link href={`/${stream.username}`} className="group block w-full max-w-sm">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200 group-hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={`/api/stream/thumb/${stream.channel.name}`}
            alt={stream.title}
            className="absolute inset-0 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2">
            <LiveBadge small />
          </div>
          <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2">
            <ViewerCount count={stream.viewers} small />
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 md:gap-3 md:p-3">
          <Avatar className="h-7 w-7 shrink-0 ring-1 ring-primary/20 md:h-8 md:w-8">
            <AvatarImage src={stream.channel.pfpUrl} alt={stream.channel.name} />
            <AvatarFallback className="text-[10px]">
              {stream.channel.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-snug md:text-sm">{stream.title}</p>
            <p className="truncate text-[10px] text-muted-foreground md:text-xs">
              {stream.channel.name}
            </p>
            {stream.category && (
              <Badge
                variant="secondary"
                className="mt-1 rounded-full px-1.5 py-0 text-[9px] font-medium md:mt-1.5 md:px-2 md:text-[10px]"
              >
                {stream.category}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function OfflineCard({ stream }: { stream: StreamWithChannel }) {
  return (
    <Link href={`/${stream.username}`} className="group inline-flex">
      <div className="flex w-[70px] flex-col items-center gap-1 rounded-lg p-1.5 transition-colors duration-150 hover:bg-muted/50 sm:w-[78px] md:w-[86px] md:gap-1.5 md:p-2">
        <div className="relative">
          <Avatar className="h-9 w-9 ring-2 ring-border transition-colors duration-150 group-hover:ring-border/60 sm:h-10 sm:w-10 md:h-11 md:w-11">
            <AvatarImage src={stream.channel.pfpUrl} alt={stream.channel.name} />
            <AvatarFallback className="text-xs font-semibold">
              {stream.channel.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/40" />
        </div>
        <p className="w-full truncate text-center text-[10px] font-medium">{stream.channel.name}</p>
      </div>
    </Link>
  );
}

function LiveBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-red-600 font-bold uppercase tracking-wide text-white ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      Live
    </span>
  );
}

function ViewerCount({ count, small }: { count: number; small?: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-black/70 font-medium text-white backdrop-blur-sm ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-xs'}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
      {count.toLocaleString()}
    </span>
  );
}

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="pb-0 text-sm font-semibold tracking-tight md:text-base">{label}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {count}
        </span>
      )}
      <div className="ml-2 h-px flex-1 bg-border" />
    </div>
  );
}
