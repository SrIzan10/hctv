import LandingPage from '@/components/app/LandingPage/LandingPage';
import StreamGrid from '@/components/app/StreamGrid/StreamGrid';
import ConfusedDino from '@/components/ui/confuseddino';
import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { user } = await validateRequest();
  if (user && !user?.hasOnboarded) {
    redirect('/onboarding');
  }

  const [liveStreams, offlineStreams] = await Promise.all([
    prisma.streamInfo.findMany({
      where: { isLive: true },
      include: { channel: true },
    }),
    prisma.streamInfo.findMany({
      where: { isLive: false },
      include: { channel: true },
    }),
  ]);

  if (!user) {
    return <LandingPage />;
  }

  if (!liveStreams.length && !offlineStreams.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <ConfusedDino className="h-28 w-28 opacity-80" />
        <div className="space-y-1.5">
          <h2 className="pb-0 text-2xl font-semibold tracking-tight">Nothing live right now</h2>
          <p className="text-sm text-muted-foreground">
            Nobody&apos;s streaming yet — why not be the first?
          </p>
        </div>
        <Link
          href="/settings/channel"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Start streaming
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <StreamGrid liveStreams={liveStreams} offlineStreams={offlineStreams} />
    </div>
  );
}
