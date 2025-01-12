'use client';
import Link from 'next/link';
import { login } from '@/lib/auth/actions';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';

export default function Page() {
  return (
    <div className="flex items-center p-4 lg:p-8">
      <div className="w-full max-w-md m-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold pb-1">Log In</h1>
        </div>
        <UniversalForm
          fields={[
            {
              name: 'username',
              label: 'Username',
              placeholder: 'Username',
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              placeholder: 'Password',
            },
          ]}
          schemaName="login"
          action={login}
          submitText="Log In"
          submitClassname="w-full"
        />
        <div className="text-center text-sm">
          No account?
          <Link className="underline pl-1" href="/auth/signUp">
            Create one!
          </Link>
        </div>
      </div>
    </div>
  );
}
