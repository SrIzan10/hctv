import type { MaybeElementRef } from '@vueuse/core';

// port of lib/hooks/useFullscreen.tsx; `target` is a template ref (element or component instance)
export function useFullscreen(target: MaybeElementRef<HTMLElement | null | undefined>) {
  const isFullscreen = ref(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      unrefElement(target)?.requestFullscreen();
      isFullscreen.value = true;
    } else {
      document.exitFullscreen();
      isFullscreen.value = false;
    }
  };

  // keep the flag honest when the user leaves fullscreen with Esc
  if (import.meta.client) {
    useEventListener(document, 'fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement;
    });
  }

  return { isFullscreen, toggleFullscreen };
}
