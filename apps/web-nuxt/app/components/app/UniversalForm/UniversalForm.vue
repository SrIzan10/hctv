<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { toast } from 'vue-sonner';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { callAction } from '~/lib/actions';
import { cn } from '~/lib/utils';
import SubmitButton from '../SubmitButton/SubmitButton.vue';
import { schemaDb } from './schemas';
import type { ActionResult } from '~/lib/actions';
import type { FormFieldBinding, FormFieldConfig, UniversalFormProps } from './types';

const props = withDefaults(defineProps<UniversalFormProps>(), {
  submitText: 'Submit',
});

const emit = defineEmits<{
  /** fired after every submission with the action result (success or not) */
  actionComplete: [result: ActionResult];
}>();

const schema = schemaDb.find((s) => s.name === props.schemaName)?.zod;
if (!schema) {
  throw new Error(`Schema "${props.schemaName}" not found`);
}

// initial value for every field ('' fallback), overridable through defaultValues
const initialValues: Record<string, any> = {};
for (const field of props.fields) {
  initialValues[field.name] = field.value ?? '';
}
Object.assign(initialValues, props.defaultValues);

const { handleSubmit, isSubmitting, values } = useForm({
  validationSchema: toTypedSchema(schema as any),
  initialValues,
});

const formEl = ref<HTMLFormElement | null>(null);
watch(
  formEl,
  (el) => {
    if (props.formRef) props.formRef.value = el;
  },
  { immediate: true }
);

const onSubmit = handleSubmit(async () => {
  // submit the raw values (like the old native form post); the server validates again
  const body = { ...values } as Record<string, any>;
  const result =
    typeof props.action === 'string' ? await callAction(props.action, body) : await props.action(body);
  if (result && !result.success) {
    toast.error(result.error ?? 'Something went wrong');
  }
  emit('actionComplete', result);
});

function binding(
  field: FormFieldConfig,
  slot: { value: unknown; handleChange: (v: unknown) => void; handleBlur: () => void }
): FormFieldBinding {
  return {
    name: field.name,
    value: slot.value,
    modelValue: slot.value,
    onChange: slot.handleChange,
    onBlur: slot.handleBlur,
    'onUpdate:modelValue': slot.handleChange,
  };
}

function applyFilter(event: Event, field: FormFieldConfig, change: (v: unknown) => void) {
  if (!field.inputFilter) return;
  const target = event.target as HTMLInputElement;
  const filtered = target.value.replace(field.inputFilter, '');
  if (filtered !== target.value) target.value = filtered;
  change(filtered);
}
</script>

<template>
  <form ref="formEl" class="space-y-2" @submit.prevent="onSubmit">
    <FormField
      v-for="field in fields"
      :key="field.name"
      v-slot="{ value, handleChange, handleBlur }"
      :name="field.name"
    >
      <FormItem :class="field.type === 'hidden' ? 'hidden' : undefined">
        <FormLabel v-if="field.type !== 'hidden' && field.label">{{ field.label }}</FormLabel>
        <FormControl>
          <component
            :is="field.component"
            v-if="field.component"
            :field="binding(field, { value, handleChange, handleBlur })"
            v-bind="field.componentProps"
          />
          <Textarea
            v-else-if="field.textArea"
            :placeholder="field.placeholder"
            :model-value="value ?? ''"
            :rows="field.textAreaRows ?? 5"
            :maxlength="field.maxChars"
            @update:model-value="handleChange"
            @blur="handleBlur"
          />
          <Input
            v-else
            :type="field.type || 'text'"
            :placeholder="field.placeholder"
            :model-value="value ?? ''"
            :maxlength="field.maxChars"
            @update:model-value="handleChange"
            @input="(e: Event) => applyFilter(e, field, handleChange)"
            @blur="handleBlur"
          />
        </FormControl>
        <FormDescription v-if="field.type !== 'hidden' && field.description">
          {{ field.description }}
        </FormDescription>
        <FormMessage v-if="field.type !== 'hidden'" />
      </FormItem>
    </FormField>
    <div :class="cn('flex gap-2 py-2', submitButtonDivClassname)">
      <slot name="otherSubmitButton" />
      <SubmitButton :button-text="submitText" :loading="isSubmitting" :class="submitClassname" />
    </div>
  </form>
</template>
