import { getBotBySlug } from '@/lib/db/resolve';
import { validateRequest } from '@/lib/auth/validate';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { GeneralSettings } from '@/app/(ui)/(protected)/settings/bot/[slug]/gensettings';
import { ApiKeys } from '@/app/(ui)/(protected)/settings/bot/[slug]/apikeys';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = await validateRequest();
  const { slug } = await params;
  const bot = await getBotBySlug(slug);

  if (!bot || bot.ownerId !== user?.id) {
    redirect('/settings/bot');
  }

  return (
    <div className={'container mx-auto py-6 space-y-6'}>
      <div className="flex items-center justify-between">
        <div className={'flex items-center space-x-4'}>
          <Image
            src={bot.pfpUrl}
            alt={'Bot Avatar'}
            width={48}
            height={48}
            className="rounded-full"
          />
          <div className={'flex flex-col'}>
            <h1 className="text-3xl font-bold tracking-tight">{bot.displayName}</h1>
            <p className="text-muted-foreground">Manage your bot account settings</p>
          </div>
        </div>
      </div>
      <div className="flex w-full gap-4 flex-col md:flex-row *:w-1/2">
        <GeneralSettings {...bot} />
        <ApiKeys slug={slug} />
      </div>
    </div>
  );
}
