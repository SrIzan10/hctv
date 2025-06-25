import { validateRequest } from '@/lib/auth/validate';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function EditLivestream() {
  const { user } = await validateRequest();
  if (!user?.hasOnboarded) {
    return null;
  }

  return (
    <Link href={`/settings/channel?tab=stream`}>
      <Button variant="outline">Edit Livestream</Button>
    </Link>
  );
}
