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
