import { resolvePersonalChannel } from '@/lib/auth/resolve';
import { loadSearchParams } from '@/lib/nuqs/channelSettings';
import { redirect } from 'next/navigation';

export default async function ChannelSettingsRedirector({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await loadSearchParams(searchParams);
  const personalChannel = await resolvePersonalChannel();
  if (personalChannel) {
    return redirect(`/settings/channel/${personalChannel.name}?tab=${tab}`);
  }

  // lil easter egg i doubt anyone will see
  return <p>erm</p>;
}
