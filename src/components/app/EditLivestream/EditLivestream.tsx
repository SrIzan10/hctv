import { validateRequest } from '@/lib/auth';
import prisma from '@/lib/db';
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
