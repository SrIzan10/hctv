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
    <div className="space-y-10">
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
          <Link href={`/${featured.username}`} className="group block max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 group-hover:shadow-md">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={`/api/stream/thumb/${featured.channel.name}`}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <LiveBadge />
                  {featured.category && (
                    <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {featured.category}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 right-3">
                  <ViewerCount count={featured.viewers} />
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/30">
                  <AvatarImage src={featured.channel.pfpUrl} alt={featured.channel.name} />
                  <AvatarFallback className="text-sm font-semibold">
                    {featured.channel.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-snug">{featured.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{featured.channel.name}</p>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <SectionHeading label="Live now" count={rest.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {offlineStreams.length > 0 && (
        <section>
          <SectionHeading label="Offline channels" count={offlineStreams.length} />
          <div className="px-8">
            <Carousel opts={{ align: 'start', dragFree: true }}>
              <CarouselContent>
                {offlineStreams.map((stream) => (
                  <CarouselItem
                    key={stream.id}
                    className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                  >
                    <OfflineCard stream={stream} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
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
          <div className="absolute bottom-2 left-2">
            <LiveBadge small />
          </div>
          <div className="absolute bottom-2 right-2">
            <ViewerCount count={stream.viewers} small />
          </div>
        </div>
        <div className="flex items-start gap-3 p-3">
          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-primary/20">
            <AvatarImage src={stream.channel.pfpUrl} alt={stream.channel.name} />
            <AvatarFallback className="text-xs">
              {stream.channel.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug">{stream.title}</p>
            <p className="truncate text-xs text-muted-foreground">{stream.channel.name}</p>
            {stream.category && (
              <Badge
                variant="secondary"
                className="mt-1.5 rounded-full px-2 py-0 text-[10px] font-medium"
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
      <div className="flex flex-col items-center gap-2 rounded-lg p-3 transition-colors duration-150 hover:bg-muted/50">
        <div className="relative">
          <Avatar className="h-16 w-16 ring-2 ring-border transition-colors duration-150 group-hover:ring-border/60">
            <AvatarImage src={stream.channel.pfpUrl} alt={stream.channel.name} />
            <AvatarFallback className="text-lg font-semibold">
              {stream.channel.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-muted-foreground/40" />
        </div>
        <p className="w-full truncate text-center text-xs font-medium">{stream.channel.name}</p>
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
      <h2 className="pb-0 text-base font-semibold tracking-tight">{label}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {count}
        </span>
      )}
      <div className="ml-2 h-px flex-1 bg-border" />
    </div>
  );
}
