<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import { Button } from '~/components/ui/button';

const { user } = useUser();
</script>

<template>
  <NuxtLink v-if="user?.hasOnboarded" to="/settings/channel?tab=stream">
    <Button variant="outline" size="sm">
      <Pencil />
      Edit stream
    </Button>
  </NuxtLink>
</template>
