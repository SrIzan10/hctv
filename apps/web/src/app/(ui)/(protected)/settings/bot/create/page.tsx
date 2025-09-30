'use client';

import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import { createBot } from '@/lib/form/actions';
import { Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-full w-full flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Create Bot Account</h1>
          <p className="text-muted-foreground max-w-xl">
            Create an automated bot account to provide custom functionality for your community.
          </p>
        </div>

        <div className="w-full max-w-md bg-card rounded-xl p-8 border border-border">
          <UniversalForm
            fields={[
              {
                name: 'name',
                type: 'text',
                label: 'Bot Name',
                placeholder: 'Enter bot name',
                required: true,
              },
              {
                name: 'slug',
                type: 'text',
                label: 'Bot Slug',
                placeholder: 'Enter bot slug',
                required: true,
              },
              {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                placeholder: 'Enter bot description',
              },
            ]}
            schemaName={'createBot'}
            action={createBot}
            onActionComplete={(res) => {
              router.push(`/settings/bot/${res.slug}`);
            }}
          />
        </div>

        {/*
          <p className="mt-6 text-sm text-muted-foreground text-center max-w-md">
            Your bot will be created with chat permissions. You can configure advanced settings and
            permissions after creation.
          </p>
        */}
      </div>
    </div>
  );
}
