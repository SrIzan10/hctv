<script setup lang="ts">
import { ref } from 'vue';
import { genUploader } from 'uploadthing/client';
import { toast } from 'vue-sonner';
import type { ourFileRouter } from '~~/server/utils/fileRouter';
import { Button } from '~/components/ui/button';

// replacement for uploadthing's <UploadButton endpoint="pfpUpload">
const props = defineProps<{ hasValue: boolean; hideHint?: boolean }>();
const emit = defineEmits<{
  (e: 'uploaded', url: string): void;
  (e: 'uploadBegin'): void;
  (e: 'uploadError', message: string): void;
}>();

const { uploadFiles } = genUploader<typeof ourFileRouter>();

const inputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

async function onChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;
  isUploading.value = true;
  emit('uploadBegin');
  try {
    const res = await uploadFiles('pfpUpload', { files });
    isUploading.value = false;
    if (res && res[0]) {
      emit('uploaded', res[0].ufsUrl);
    }
  } catch (error) {
    isUploading.value = false;
    const message = error instanceof Error ? error.message : 'Upload failed';
    emit('uploadError', message);
    toast.error(`Upload failed: ${message}`);
  }
}
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onChange" />
    <Button
      type="button"
      variant="outline"
      size="sm"
      :disabled="isUploading"
      @click="inputRef?.click()"
    >
      {{ props.hasValue ? 'Upload new image' : 'Upload image' }}
    </Button>
    <p v-if="!hideHint" class="text-xs text-muted-foreground">Any image up to 1 MB.</p>
  </div>
</template>
