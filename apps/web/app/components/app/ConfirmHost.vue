<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

const request = useConfirmState();

function settle(value: boolean) {
  const current = request.value;
  if (!current) return;
  request.value = null;
  current.resolve(value);
}
</script>

<template>
  <AlertDialog :open="!!request" @update:open="(open: boolean) => !open && settle(false)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ request?.title ?? 'Are you absolutely sure?' }}</AlertDialogTitle>
        <AlertDialogDescription v-if="request?.description">
          {{ request.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="settle(false)">
          {{ request?.cancelText ?? 'Cancel' }}
        </AlertDialogCancel>
        <AlertDialogAction
          :class="buttonVariants({ variant: request?.variant ?? 'default' })"
          @click="settle(true)"
        >
          {{ request?.confirmText ?? 'Continue' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
