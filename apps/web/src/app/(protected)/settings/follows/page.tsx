import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotifyToggle from './notifyToggle';

export default async function Page() {
  const { user } = await validateRequest();
  const following = await prisma.follow.findMany({
    where: {
      userId: user!.id,
    },
    include: {
      channel: true,
    },
  });

  if (!following.length) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <h1 className="text-2xl font-bold">No channels followed</h1>
        <p className="text-muted-foreground">Go follow some first?</p>
        <Link href={'/'}>
          <Button>Back home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Followed Channels</h1>
      <Table className="max-w-2xl mx-auto outline-surface bg-mantle rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Channel</TableHead>
            <TableHead className="w-[100px] text-center">Notifications</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {following.map((channel) => (
            <TableRow key={channel.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={channel.channel.pfpUrl} alt={channel.channel.name} />
                    <AvatarFallback>{channel.channel.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link href={`/${channel.channel.name}`} className="hover:underline">
                    {channel.channel.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <NotifyToggle channel={channel.channel.name} toggled={channel.notifyStream} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
