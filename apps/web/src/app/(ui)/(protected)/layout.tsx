import { validateRequest } from '@/lib/auth/validate';
import { redirect, RedirectType } from 'next/navigation';
import { prisma } from '@hctv/db';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest();
  if (!user) {
    return redirect('/auth/hackclub');
  }
  if (!user.hasOnboarded) {
    return redirect(`/onboarding`, RedirectType.push);
  }

  const ban = await prisma.userBan.findUnique({
    where: { userId: user.id },
  });

  if (ban) {
    const isExpired = ban.expiresAt && new Date(ban.expiresAt) < new Date();
    if (!isExpired) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-3xl font-bold text-destructive mb-4">Account Suspended</h1>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Your account has been suspended from hackclub.tv.
          </p>
          <div className="bg-muted p-4 rounded-lg max-w-md">
            <p className="text-sm font-medium">Reason:</p>
            <p className="text-sm text-muted-foreground">{ban.reason}</p>
          </div>
          {ban.expiresAt && (
            <p className="text-sm text-muted-foreground mt-4">
              Expires: {new Date(ban.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      );
    }
  }

  return children;
}
