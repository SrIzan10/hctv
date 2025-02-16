import LandingPage from '@/components/app/LandingPage/LandingPage';
import { Card, CardContent } from '@/components/ui/card';
import { validateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { user } = await validateRequest();
  if (user && !user?.hasOnboarded) {
    redirect('/onboarding');
  }
  const streams = await prisma.streamInfo.findMany({
    where: {
      isLive: true,
    },
    include: {
      channel: true,
    },
  });
  if (!user) {
    return <LandingPage />;
  }
  if (!streams.length) {
    return <div>No streams found</div>;
  }

  return (
    <div className='p-4'>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {streams.map((stream) => (
          <Link href={`/${stream.username}`} key={stream.id}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative">
                  <Image
                    src={stream.channel.pfpUrl || '/placeholder.svg'}
                    width={512}
                    height={512}
                    alt={stream.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    LIVE
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {stream.viewers} viewers
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={stream.channel.pfpUrl} />
                      <AvatarFallback>{stream.channel.name}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold line-clamp-1">{stream.title}</h3>
                      <p className="text-sm text-muted-foreground">{stream.category}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
