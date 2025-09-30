'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Path, useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import type { UniversalFormProps } from './types';
import SubmitButton from '../SubmitButton/SubmitButton';
import { useActionState } from 'react';
import React from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  createBotSchema,
  createChannelSchema, editBotSchema, onboardSchema, streamInfoEditSchema, updateChannelSettingsSchema
} from '@/lib/form/zod';

export const schemaDb = [
  { name: 'streamInfoEdit', zod: streamInfoEditSchema },
  { name: 'onboard', zod: onboardSchema },
  { name: 'createChannel', zod: createChannelSchema },
  { name: 'updateChannelSettings', zod: updateChannelSettingsSchema },
  { name: 'createBot', zod: createBotSchema },
  { name: 'editBot', zod: editBotSchema }
] as const;

export function UniversalForm<T extends z.ZodType>({
  fields,
  schemaName,
  action,
  onActionComplete,
  defaultValues,
  submitText = 'Submit',
  submitClassname,
  otherSubmitButton,
  submitButtonDivClassname,
}: UniversalFormProps<T>) {
  // @ts-expect-error - idk
  const [state, formAction] = useActionState<{ success: boolean; error?: string }>(action, null);
  const schema = schemaDb.find((s) => s.name === schemaName)?.zod;

  if (!schema) {
    throw new Error(`Schema "${schemaName}" not found`);
  }

  // Initialize default values for all fields
  const initialValues = React.useMemo(() => {
    const values: Record<string, any> = {};
    fields.forEach((field) => {
      values[field.name] = field.value ?? ''; // Use empty string as fallback
    });
    return { ...values, ...defaultValues };
  }, [fields, defaultValues]);

  type FormData = z.infer<T>;
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: initialValues as FormData,
  });

  React.useEffect(() => {
    if (state && !state.success) {
      toast.error(state.error);
    }
    if (state) {
      onActionComplete?.(state);
    }
  }, [state, onActionComplete]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-2">
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as Path<FormData>}
            render={({ field: formField }) => (
              <FormItem>
                {(field.type !== 'hidden' || field.label) && <FormLabel>{field.label}</FormLabel>}
                <FormControl>
                  {field.component ? (
                    field.component({ field: formField, ...field.componentProps })
                  ) : field.textArea ? (
                    <Textarea
                      placeholder={field.placeholder}
                      {...formField}
                      value={formField.value ?? ''}
                      rows={field.textAreaRows ?? 5}
                    />
                  ) : (
                    <Input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      {...formField}
                      value={formField.value ?? ''}
                    />
                  )}
                </FormControl>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className={cn("flex gap-2 py-2", submitButtonDivClassname)}>
          {otherSubmitButton}
          <SubmitButton buttonText={submitText} className={submitClassname} />
        </div>
      </form>
    </Form>
  );
}