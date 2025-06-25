import { resolvePersonalChannel } from "@/lib/auth/resolve";
import { redirect } from "next/navigation";

export default async function ChannelSettingsRedirector() {
  const personalChannel = await resolvePersonalChannel();
  if (personalChannel) {
    return redirect(`/settings/channel/${personalChannel.name}`);
  }

  // lil easter egg which i doubt anyone will see
  return <p>erm</p>;
}