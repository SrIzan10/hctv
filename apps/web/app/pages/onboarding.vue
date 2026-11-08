<script setup lang="ts">
import { User, Tv, Heart, MessageSquare } from '@lucide/vue';
import UniversalForm from '~/components/app/UniversalForm/UniversalForm.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { ActionResult } from '~/lib/actions';

// (ui)/(public)/onboarding page.tsx + page.client.tsx
const { data: me } = await useFetch('/api/me', meFetchOptions);
const user = computed(() => me.value?.user ?? null);

if (!user.value || user.value.hasOnboarded) {
  await navigateTo('/');
}

const fields = computed(() => [
  { name: 'userId', label: 'User ID', type: 'hidden', value: user.value?.id },
  {
    name: 'username',
    label: 'Channel Username',
    type: 'text',
    placeholder: 'e.g., yourname or yourname-codes',
    maxChars: 20,
    inputFilter: /[^a-z0-9_-]/g,
  },
]);

function onActionComplete(result: ActionResult) {
  // the old page redirected after any completion (even a failed one); only do it on success
  if (result.success) window.location.href = '/';
}
</script>

<template>
  <div class="min-h-[93vh] flex items-center justify-center p-4">
    <div class="w-full max-w-2xl space-y-8">
      <!-- welcome header -->
      <div class="text-center space-y-2">
        <div class="flex justify-center">
          <div class="relative">
            <Avatar class="h-20 w-20 border-4 border-primary/20">
              <AvatarImage :src="user?.pfpUrl ?? ''" :alt="`@${user?.id}`" />
              <AvatarFallback class="text-2xl font-bold">
                {{ user?.id?.charAt(0)?.toUpperCase() }}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">Welcome to hackclub.tv!</h1>
          <p class="text-lg text-muted-foreground flex gap-2 justify-center">
            Let's get you set up
            <NuxtImg src="/blahaj-heart.webp" alt=":blahaj-heart:" height="28" />
          </p>
        </div>
      </div>

      <!-- explanation -->
      <Card class="border-2 border-primary/10 bg-primary/5">
        <CardHeader class="pb-4">
          <CardTitle class="flex items-center gap-2 text-xl">
            <User class="h-5 w-5 text-primary" />
            Why do you need a personal channel?
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"
              >
                <Tv class="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-sm">Stream content</h3>
                <p class="text-xs text-muted-foreground">
                  Share your coding sessions and projects!
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"
              >
                <MessageSquare class="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-sm">Chat with others</h3>
                <p class="text-xs text-muted-foreground">
                  Connect with other Hack Clubbers and grow your audience
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"
              >
                <Heart class="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-sm">Follow Hack Clubbers</h3>
                <p class="text-xs text-muted-foreground">
                  Stay updated with your favorite creators and streams
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6 p-4 bg-secondary/50 rounded-lg border border-muted">
            <p class="text-sm text-muted-foreground">
              <strong>Your personal channel</strong> is your home base on hctv. It's where your
              profile, streams, and content will live. You can always create additional channels
              later for different types of content!
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- form -->
      <Card class="shadow-lg">
        <CardHeader class="text-center">
          <CardTitle class="text-xl">Choose Your Channel Username</CardTitle>
          <CardDescription>
            This will be your unique identifier on hctv. Choose something memorable!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UniversalForm
            :fields="fields"
            schema-name="onboard"
            action="onboard"
            @action-complete="onActionComplete"
          />
          <div class="mt-4 p-3 bg-muted/30 rounded-md">
            <p class="text-xs text-muted-foreground">
              <strong>Username rules:</strong> Only lowercase letters (a-z), numbers (0-9),
              underscores (_), and dashes (-) are allowed. Up to 20 characters. Must be unique
              across the platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
