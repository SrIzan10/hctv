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
import { roomService } from '@/lib/services/livekit';
import { UniversalForm } from '../UniversalForm/UniversalForm';
import { editStreamInfo } from '@/lib/form/actions';

export default async function EditLivestream() {
  const { user } = await validateRequest();
  if ((await prisma.streamInfo.count({ where: { username: user!.username } })) === 0) {
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
  const streamInfo = await prisma.streamInfo.findUnique({
    where: { username: user!.username! },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Livestream</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit livestream</DialogTitle>
          <DialogDescription>Regenerate a key or edit your stream metadata</DialogDescription>
        </DialogHeader>
        <UniversalForm
          fields={[
            { name: 'username', label: 'Username', value: user?.username!, type: 'hidden' },
            { name: 'title', label: 'Title', type: 'text', value: streamInfo?.title },
            { name: 'category', label: 'Category', type: 'text', value: streamInfo?.category },
          ]}
          schemaName="streamInfoEdit"
          action={editStreamInfo}
          submitButtonDivClassname="float-right"
          submitText="Save"
          key={streamInfo?.id}
        />
      </DialogContent>
    </Dialog>
  );
}
