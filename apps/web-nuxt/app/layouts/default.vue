<script setup lang="ts">
import { SidebarProvider } from '@/components/ui/sidebar';
import AccountSuspended from '~/components/app/AccountSuspended.vue';
import EditLivestream from '~/components/app/EditLivestream/EditLivestream.vue';
import NavBar from '~/components/app/NavBar/NavBar.vue';
import Sidebar from '~/components/app/Sidebar/Sidebar.vue';
import SonnerNewVersion from '~/components/app/SonnerNewVersion/SonnerNewVersion.vue';

// the `(ui)` group layout: fixed navbar + collapsible sidebar + content
useHead({ bodyAttrs: { class: 'flex h-screen flex-col' } });

const sidebarCookie = useCookie<string | boolean | null>('sidebar_state');
const defaultOpen = String(sidebarCookie.value) === 'true';

// replaces StreamInfoProvider: starts the shared 5s /api/stream/info poll
useStreamInfo();

const ban = useState<{ reason: string; expiresAt: string | null } | null>(
  'account-ban',
  () => null
);
</script>

<template>
  <SidebarProvider :default-open="defaultOpen">
    <ClientOnly>
      <SonnerNewVersion />
    </ClientOnly>
    <NavBar>
      <template #editLivestream>
        <EditLivestream />
      </template>
    </NavBar>
    <div class="flex flex-1 pt-14 md:pt-16 min-h-0 min-w-0">
      <!-- pt-14/pt-16 matches the navbar's h-14/h-16 breakpoints -->
      <Sidebar class="pt-14 md:pt-16" />
      <main class="flex-1 min-w-0">
        <AccountSuspended v-if="ban" :ban="ban" />
        <slot v-else />
      </main>
    </div>
  </SidebarProvider>
</template>
