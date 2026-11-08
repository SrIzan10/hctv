const MOBILE_BREAKPOINT = 768;

// port of lib/hooks/useMobile.tsx; false during SSR, updates on the client
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
