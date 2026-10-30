<script setup lang="ts">
import { Button } from '~/components/ui/button';

const { user } = useUser();
</script>

<template>
  <NuxtLink v-if="user?.hasOnboarded" to="/settings/channel?tab=stream">
    <Button variant="outline">Edit Livestream</Button>
  </NuxtLink>
</template>
