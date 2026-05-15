import type { HTMLInputTypeAttribute, Ref } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { schemaDb } from './UniversalForm';

type FormFieldValue = string | number | boolean | null | undefined;

export type FormFieldConfig = {
  name: string;
  label?: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  description?: string;
  value?: FormFieldValue;
  textArea?: boolean;
  textAreaRows?: number;
  maxChars?: number;
  inputFilter?: RegExp;
  component?: (
    props: {
      field: ControllerRenderProps<FieldValues>;
    } & Record<string, unknown>
  ) => React.ReactNode;
  componentProps?: Record<string, any>;
  required?: boolean;
};

export type UniversalFormProps = {
  fields: FormFieldConfig[];
  schemaName: (typeof schemaDb)[number]['name'];
  action: (prev: any, formData: FormData) => void;
  onActionComplete?: (result: any) => void;
  defaultValues?: Partial<FieldValues>;
  formRef?: Ref<HTMLFormElement>;
  submitText?: string;
  submitClassname?: string;
  otherSubmitButton?: React.ReactNode;
  submitButtonDivClassname?: string;
};
