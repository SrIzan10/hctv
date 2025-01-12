import { z } from 'zod';
import { HTMLInputTypeAttribute } from 'react';
import { schemaDb } from './UniversalForm';

export type FormFieldConfig = {
  name: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  description?: string;
  value?: string;
  textArea?: boolean;
  textAreaRows?: number;
};

export type UniversalFormProps<T extends z.ZodType> = {
  fields: FormFieldConfig[];
  schemaName: (typeof schemaDb)[number]['name'];
  action: (prev: any, formData: FormData) => void;
  onActionComplete?: (result: unknown) => void;
  defaultValues?: Partial<z.infer<T>>;
  submitText?: string;
  submitClassname?: string;
  otherSubmitButton?: React.ReactNode;
  submitButtonDivClassname?: string;
};  