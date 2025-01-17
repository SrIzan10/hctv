import LiveStream from "@/components/app/Livestream/Livestream";

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <LiveStream username={username} />
  );
}
