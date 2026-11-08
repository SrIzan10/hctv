<script setup lang="ts">
defineProps<{
  ban: { reason: string; expiresAt: string | Date | null };
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-3xl font-bold text-destructive mb-4">Account Suspended</h1>
    <p class="text-muted-foreground text-center max-w-md mb-4">
      Your account has been suspended from hackclub.tv.
    </p>
    <div class="bg-muted p-4 rounded-lg max-w-md">
      <p class="text-sm font-medium">Reason:</p>
      <p class="text-sm text-muted-foreground">{{ ban.reason }}</p>
    </div>
    <p v-if="ban.expiresAt" class="text-sm text-muted-foreground mt-4">
      Expires: {{ new Date(ban.expiresAt).toLocaleDateString() }}
    </p>
  </div>
</template>
