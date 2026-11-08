<template>
  <div class="space-y-3">
    <div
      v-for="i in 5"
      :key="i"
      class="h-14 rounded-lg bg-muted/40 animate-pulse"
      :style="{ opacity: 1 - (i - 1) * 0.15 }"
    />
  </div>
</template>
