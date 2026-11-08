<script setup lang="ts">
import { reactive, ref } from 'vue';
import { Loader2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { callAction } from '~/lib/actions';
import { cn } from '~/lib/utils';

// local port of UniversalForm for the settings pages: same field config, but posts the values
// as JSON to /api/actions/<action> (validation happens server-side exactly like the Next actions)
export type SettingsFormField = {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  description?: string;
  value?: string | number | boolean | null;
  textArea?: boolean;
  textAreaRows?: number;
  maxChars?: number;
  inputFilter?: RegExp;
  required?: boolean;
  // render the control through the `field-<name>` slot instead
  custom?: boolean;
};

export type SettingsFormResult = {
  success: boolean;
  error?: string;
  [key: string]: any;
};

const props = withDefaults(
  defineProps<{
    fields: SettingsFormField[];
    action: string;
    submitText?: string;
    submitClass?: string;
    submitButtonDivClass?: string;
    // lay short fields out side by side; text areas and custom fields span both columns
    twoColumn?: boolean;
  }>(),
  { submitText: 'Submit' }
);

const emit = defineEmits<{
  (e: 'actionComplete', result: SettingsFormResult): void;
}>();

const values = reactive<Record<string, any>>({});
for (const field of props.fields) {
  values[field.name] = field.value ?? '';
}

const isPending = ref(false);

function update(name: string, value: unknown) {
  values[name] = value;
}

function onInput(field: SettingsFormField, value: string | number) {
  let next = String(value);
  if (field.inputFilter) {
    next = next.replace(field.inputFilter, '');
  }
  values[field.name] = next;
}

async function submit() {
  if (isPending.value) return;
  isPending.value = true;
  try {
    const result = (await callAction(props.action, { ...values })) as SettingsFormResult;
    if (result && !result.success) {
      toast.error(result.error || 'Something went wrong');
    }
    if (result) {
      emit('actionComplete', result);
    }
  } finally {
    isPending.value = false;
  }
}

defineExpose({ submit });
</script>

<template>
  <form :class="twoColumn ? 'grid gap-5 sm:grid-cols-2' : 'space-y-5'" @submit.prevent="submit">
    <div
      v-for="field in fields"
      :key="field.name"
      :class="
        field.type === 'hidden'
          ? 'hidden'
          : cn(
              'grid content-start gap-2',
              twoColumn && (field.textArea || field.custom) && 'sm:col-span-2'
            )
      "
    >
      <Label v-if="field.type !== 'hidden' && field.label">{{ field.label }}</Label>
      <slot
        v-if="field.custom"
        :name="`field-${field.name}`"
        :value="values[field.name]"
        :update="(v: unknown) => update(field.name, v)"
        :name-attr="field.name"
      />
      <Textarea
        v-else-if="field.textArea"
        :name="field.name"
        :placeholder="field.placeholder"
        :model-value="values[field.name] ?? ''"
        :rows="field.textAreaRows ?? 5"
        :maxlength="field.maxChars"
        @update:model-value="(v: string | number) => update(field.name, v)"
      />
      <Input
        v-else
        :type="field.type || 'text'"
        :name="field.name"
        :placeholder="field.placeholder"
        :model-value="values[field.name] ?? ''"
        :maxlength="field.maxChars"
        @update:model-value="(v: string | number) => onInput(field, v)"
      />
      <p v-if="field.type !== 'hidden' && field.description" class="text-sm text-muted-foreground">
        {{ field.description }}
      </p>
    </div>
    <div :class="cn('flex gap-2 py-2', twoColumn && 'sm:col-span-2', submitButtonDivClass)">
      <slot name="other-submit" />
      <Button type="submit" :class="submitClass" :disabled="isPending">
        <Loader2 v-if="isPending" class="size-4 animate-spin" />
        {{ submitText }}
      </Button>
    </div>
  </form>
</template>
