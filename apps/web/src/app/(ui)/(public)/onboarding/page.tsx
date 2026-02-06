import { validateRequest } from '@/lib/auth/validate';
import { redirect } from "next/navigation";
import OnboardingClient from "./page.client";

export default async function Page() {
  const { user } = await validateRequest();
  if (!user) {
    return redirect('/');
  }
  if (user.hasOnboarded) {
    return redirect('/');
  }
  return <OnboardingClient />;
}