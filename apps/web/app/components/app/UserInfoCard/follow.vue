<script setup lang="ts">
import { Heart, HeartCrack } from '@lucide/vue';
import { Button } from '~/components/ui/button';

const props = defineProps<Props>();

const buttonRef = ref<{ $el: HTMLElement } | null>(null);
const buttonEl = computed(() => buttonRef.value?.$el ?? null);
const isHovering = useElementHover(buttonEl);
const following = ref(false);
const isMutating = ref(false);

const {
  data: followingData,
  status,
  error,
} = useFetch<{ following: boolean }>('/api/stream/follow', {
  key: `follow-${props.channel}`,
  query: { username: props.channel },
  lazy: true,
  server: false,
});

const isLoadingFollowing = computed(() => status.value === 'pending' || status.value === 'idle');
// the endpoint 401s (logged out) / 418s (own channel): hide the button, like the original
const bye = computed(() => !isLoadingFollowing.value && (!followingData.value || !!error.value));

watch(
  followingData,
  (value) => {
    if (value) {
      following.value = value.following;
    }
  },
  { immediate: true }
);

async function toggleFollow() {
  isMutating.value = true;
  try {
    const result = await $fetch<{ following: boolean }>('/api/stream/follow', {
      method: 'POST',
      query: { username: props.channel },
    });
    if (result) {
      following.value = result.following;
    }
  } catch (e) {
    console.error('Failed to toggle follow:', e);
  } finally {
    isMutating.value = false;
  }
}

interface Props {
  channel: string;
}
</script>

<template>
  <Button
    ref="buttonRef"
    size="sm"
    :variant="following ? 'outline' : 'default'"
    :disabled="isMutating || isLoadingFollowing"
    :class="['min-w-[104px]', bye && 'hidden']"
    @click="toggleFollow"
  >
    <template v-if="following && isHovering">
      <HeartCrack />
      Unfollow
    </template>
    <template v-else-if="following">
      <Heart class="fill-current" />
      Following
    </template>
    <template v-else>
      <Heart />
      Follow
    </template>
  </Button>
</template>
