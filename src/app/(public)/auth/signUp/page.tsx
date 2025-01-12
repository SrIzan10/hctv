'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { signup } from '@/lib/auth/actions';
import SubmitButton from '@/components/app/SubmitButton/SubmitButton';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';

export default function Page() {
  const [signupData, signupAction] = useActionState(signup, null);
  useEffect(() => {
    if (signupData?.error) {
      toast.error(signupData.error);
    }
  }, [signupData]);
  return (
    <div className="flex items-center p-6 lg:p-8">
      <div className="w-full max-w-md m-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold pb-1">Sign Up</h1>
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
          schemaName="register"
          action={signup}
          submitText="Sign Up"
          submitClassname="w-full"
        />
        <div className="text-center text-sm">
          Already have an account?
          <Link className="underline pl-1" href="/auth/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
