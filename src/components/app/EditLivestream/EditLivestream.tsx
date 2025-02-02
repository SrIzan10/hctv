import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { validateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { UniversalForm } from '../UniversalForm/UniversalForm';
import { editStreamInfo } from '@/lib/form/actions';
import RegenerateKey from '../RegenerateKey/RegenerateKey';
import EditLivestreamDialog from './dialog';

export default async function EditLivestream() {
  const { user } = await validateRequest();
  /* if ((await prisma.streamInfo.count({ where: { username: user!.username } })) === 0) {
    const isLive =
      (await roomService.listRooms()).filter((r) => r.name === user!.username)[0].numPublishers >= 1;
    await prisma.streamInfo.create({
      data: {
        username: user!.username,
        title: 'Untitled',
        category: 'Uncategorized',
        startedAt: new Date(),
        thumbnail: 'https://placehold.co/150',
        viewers: 0,
        isLive,
        ownedBy: { connect: { username: user!.username } },
      },
    });
    console.log('created');
  }
  }); */
  if (!user?.hasOnboarded) {
    return null;
  }
  const ownedChannels = await prisma.channel.findMany({
    where: {
      OR: [{ ownerId: user.id }, { managers: { some: { id: user.id } } }],
    },
  });

  return <EditLivestreamDialog ownedChannels={ownedChannels} />;
}
