'use client';
import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { editBot } from '@/lib/form/actions';
import { BotAccount } from '@hctv/db';
import { useRouter } from 'next/navigation';

export function GeneralSettings(props: BotAccount) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Edit your bot settings!</CardDescription>
      </CardHeader>
      <CardContent>
        <UniversalForm
          fields={[
            {
              name: 'from',
              type: 'hidden',
              value: props.id,
              required: true,
            },
            {
              name: 'name',
              type: 'text',
              label: 'Bot Name',
              placeholder: 'Enter bot name',
              required: true,
              value: props.displayName,
            },
            {
              name: 'slug',
              type: 'text',
              label: 'Bot Slug',
              placeholder: 'Enter bot slug',
              required: true,
              value: props.slug
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
              placeholder: 'Enter bot description',
              value: props.description,
              textArea: true,
            },
          ]}
          schemaName={'editBot'}
          action={editBot}
        />
      </CardContent>
    </Card>
  )
}