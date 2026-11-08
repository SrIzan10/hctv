<script setup lang="ts">
import { Button } from '@/components/ui/button';
import ConfusedDino from '~/components/ui/confuseddino/ConfusedDino.vue';
</script>

<template>
  <section
    class="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-16 text-center"
  >
    <ConfusedDino class="h-32 w-32 opacity-90 md:h-40 md:w-40" />
    <div class="space-y-4">
      <h1 class="text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
        Watch Hack Clubbers build things, live.
      </h1>
      <p class="mx-auto max-w-[52ch] text-lg text-muted-foreground">
        hackclub.tv is where Hack Clubbers stream what they're making: code, hardware, art, games.
        Sign in with your Hack Club account to watch, chat, and go live yourself.
      </p>
    </div>
    <a href="/auth/hackclub">
      <Button size="lg" class="h-12 px-7 text-base">Sign in with Hack Club</Button>
    </a>
  </section>
</template>
