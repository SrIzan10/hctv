<script setup lang="ts">
import { Play, Users } from '@lucide/vue';
import { Button } from '@/components/ui/button';
</script>

<template>
  <main class="flex-1">
    <section class="relative w-full py-20 md:py-32 lg:py-40 xl:py-48 overflow-hidden">
      <div class="absolute inset-0"></div>
      <div class="container px-4 md:px-6 relative">
        <div class="flex flex-col items-center space-y-8 text-center">
          <div class="space-y-6">
            <h1
              class="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-primary"
            >
              hackclub.tv
            </h1>
            <p class="mx-auto max-w-[600px] text-lg text-muted-foreground md:text-xl">
              The streaming website for Hack Clubbers, by Hack Clubbers.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row">
            <NuxtLink to="/login" class="space-x-4">
              <Button size="lg" class="px-8 py-3 text-lg font-semibold">
                <Play class="w-5 h-5 mr-2" />
                Start Streaming
              </Button>
              <Button variant="outline" size="lg" class="px-8 py-3 text-lg font-semibold">
                <Users class="w-5 h-5 mr-2" />
                Watch Streams
              </Button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
