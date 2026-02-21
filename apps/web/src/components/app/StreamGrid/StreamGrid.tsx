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
  const sorted = [...liveStreams].sort((a, b) => b.viewers - a.viewers);
  const [featured, ...rest] = sorted;

  return (
    <div className="space-y-8 md:space-y-10">
      {!featured && (
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

      {featured && (
        <section>
          <SectionHeading label="Featured" />
          <Link href={`/${featured.username}`} className="group block w-full md:max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 group-hover:shadow-md">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={`/api/stream/thumb/${featured.channel.name}`}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 md:bottom-3 md:left-3 md:gap-2">
                  <LiveBadge />
                  {featured.category && (
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm md:px-2.5 md:text-xs">
                      {featured.category}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3">
                  <ViewerCount count={featured.viewers} />
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 md:gap-4 md:p-4">
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/30 md:h-10 md:w-10">
                  <AvatarImage src={featured.channel.pfpUrl} alt={featured.channel.name} />
                  <AvatarFallback className="text-sm font-semibold">
                    {featured.channel.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-snug md:text-base">
                    {featured.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                    {featured.channel.name}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <SectionHeading label="Live now" count={rest.length} />
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((stream) => (
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
                    className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-1/8"
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
    <Link href={`/${stream.username}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200 group-hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={`/api/stream/thumb/${stream.channel.name}`}
            alt={stream.title}
            className="h-full w-full object-cover"
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
    <Link href={`/${stream.username}`} className="group block">
      <div className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors duration-150 hover:bg-muted/50 md:gap-2 md:p-3">
        <div className="relative">
          <Avatar className="h-12 w-12 ring-2 ring-border transition-colors duration-150 group-hover:ring-border/60 md:h-16 md:w-16">
            <AvatarImage src={stream.channel.pfpUrl} alt={stream.channel.name} />
            <AvatarFallback className="text-base font-semibold md:text-lg">
              {stream.channel.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground/40 md:h-3.5 md:w-3.5" />
        </div>
        <p className="w-full truncate text-center text-[10px] font-medium md:text-xs">
          {stream.channel.name}
        </p>
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
