<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';

// `loading` replaces react-dom's useFormStatus().pending (UniversalForm passes its submitting state)
defineProps<{
  buttonText: string;
  loading?: boolean;
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  class?: string;
}>();
</script>

<template>
  <Button type="submit" :loading="loading" :variant="variant" :size="size" :class="$props.class">
    {{ buttonText }}
  </Button>
</template>
