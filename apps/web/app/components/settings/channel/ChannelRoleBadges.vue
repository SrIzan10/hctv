<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '~/components/ui/badge';
import { ROLE_BADGE_META } from './types';
import type { ChannelRoleBadgeKey } from './types';

const props = defineProps<{ roles: ChannelRoleBadgeKey[] }>();

const uniqueRoles = computed(() => [...new Set(props.roles)]);
</script>

<template>
  <div class="flex items-center gap-1.5 flex-wrap justify-end">
    <Badge v-for="role in uniqueRoles" :key="role" variant="outline" :class="ROLE_BADGE_META[role].className">
      <component :is="ROLE_BADGE_META[role].icon" class="h-3 w-3 mr-1" />
      {{ ROLE_BADGE_META[role].label }}
    </Badge>
  </div>
</template>
