import { z } from 'zod';
import { HTMLInputTypeAttribute } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { schemaDb } from './UniversalForm';

export type FormFieldConfig = {
  name: string;
  label?: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  description?: string;
  value?: any;
  textArea?: boolean;
  textAreaRows?: number;
  component?: (props: { field: ControllerRenderProps<any, any> } & any) => React.ReactNode;
  componentProps?: Record<string, any>;
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