import { validateRequest } from '@/lib/auth/validate';
import { redirect, RedirectType } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest();
  if (!user) {
    return redirect('/auth/slack');
  }
  if (!user.hasOnboarded) {
    return redirect(`/onboarding`, RedirectType.push);
  }
  return children;
}
