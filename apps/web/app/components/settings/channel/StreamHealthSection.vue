<script setup lang="ts">
import SettingsSection from '~/components/settings/SettingsSection.vue';
import StreamHealthCard from '~/components/app/StreamHealth/StreamHealthCard.vue';
import type { ChannelSettingsChannel } from './types';

defineProps<{ channel: ChannelSettingsChannel }>();
</script>

<template>
  <SettingsSection
    title="Stream health"
    description="While you're live, this checks your encoder settings for anything that adds delay or breaks playback."
  >
    <StreamHealthCard :channel-name="channel.name" />
  </SettingsSection>
</template>
