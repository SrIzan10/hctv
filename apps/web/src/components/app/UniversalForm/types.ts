import type { HTMLInputTypeAttribute, Ref } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { z } from 'zod';
import { schemaDb } from './UniversalForm';

export type FormFieldConfig<T extends z.ZodType> = {
  name: string;
  label?: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  description?: string;
  value?: z.input<T>[keyof z.input<T>];
  textArea?: boolean;
  textAreaRows?: number;
  maxChars?: number;
  inputFilter?: RegExp;
  component?: (
    props: {
      field: ControllerRenderProps<z.infer<T>>;
    } & Record<string, unknown>
  ) => React.ReactNode;
  componentProps?: Record<string, any>;
  required?: boolean;
};

export type UniversalFormProps<T extends z.ZodType> = {
  fields: FormFieldConfig<T>[];
  schemaName: (typeof schemaDb)[number]['name'];
  action: (prev: any, formData: FormData) => void;
  onActionComplete?: (result: any) => void;
  defaultValues?: Partial<z.infer<T>>;
  formRef?: Ref<HTMLFormElement>;
  submitText?: string;
  submitClassname?: string;
  otherSubmitButton?: React.ReactNode;
  submitButtonDivClassname?: string;
};
