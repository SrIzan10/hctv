'use client';

import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { onboard } from '@/lib/form/actions';
import { useSession } from '@/lib/providers/SessionProvider';
import { redirect, useRouter } from 'next/navigation';

export default function OnboardingClient() {
  const { user } = useSession();
  const router = useRouter();
  
  return (
    <Card className="mx-auto max-w-sm border-0 shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle>Welcome to hackclub.tv!</CardTitle>
        <CardDescription>
          To get started, please enter the username for your main channel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UniversalForm
          fields={[
            { name: 'userId', label: 'User ID', type: 'hidden', value: user?.id },
            { name: 'username', label: 'Username', type: 'text' },
          ]}
          schemaName="onboard"
          action={onboard}
          onActionComplete={() => {
            router.refresh();
            redirect('/');
          }}
        />
      </CardContent>
    </Card>
  );
}
