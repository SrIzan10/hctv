<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
}>();
</script>

<template>
  <section
    class="grid gap-x-10 gap-y-4 border-t py-8 first:border-t-0 first:pt-2 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"
  >
    <div>
      <h2 :class="['font-bold', tone === 'danger' && 'text-destructive']">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm leading-relaxed text-muted-foreground">
        {{ description }}
      </p>
      <div v-if="$slots.aside" class="mt-4">
        <slot name="aside" />
      </div>
    </div>
    <div class="min-w-0">
      <slot />
    </div>
  </section>
</template>
