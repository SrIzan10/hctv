import type { Component, Ref } from 'vue';
import type { ActionResult } from '~/lib/actions';
import type { schemaDb } from './schemas';

type FormFieldValue = string | number | boolean | null | undefined;

// what a custom `component` receives as its `field` prop (vee-validate field handlers)
export type FormFieldBinding = {
  name: string;
  value: unknown;
  modelValue: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  'onUpdate:modelValue': (value: unknown) => void;
};

export type FormFieldConfig = {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  description?: string;
  value?: FormFieldValue;
  textArea?: boolean;
  textAreaRows?: number;
  maxChars?: number;
  inputFilter?: RegExp;
  // Vue component (or functional component / render function) rendered instead of the input;
  // it gets `{ field: FormFieldBinding, ...componentProps }` as props
  component?: Component | ((props: any) => any);
  componentProps?: Record<string, any>;
  required?: boolean;
};

export type UniversalFormProps = {
  fields: FormFieldConfig[];
  schemaName: (typeof schemaDb)[number]['name'];
  // action name (`POST /api/actions/<name>`) or a function receiving the raw form values
  action: string | ((values: Record<string, any>) => Promise<ActionResult> | ActionResult);
  defaultValues?: Record<string, any>;
  formRef?: Ref<HTMLFormElement | null>;
  submitText?: string;
  submitClassname?: string;
  submitButtonDivClassname?: string;
};
