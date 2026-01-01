import { validateRequest } from '@/lib/auth/validate';
import { redirect } from 'next/navigation';
import AdminPanelClient from './page.client';

export default async function AdminPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect('/auth/hackclub');
  }

  if (!user.isAdmin) {
    redirect('/');
  }

  return <AdminPanelClient currentUser={user} />;
}
