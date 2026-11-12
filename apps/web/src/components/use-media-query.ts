import { useCallback, useSyncExternalStore } from 'react';

/** A phone: tables use compact columns while preserving their interactions. */
export const NARROW_SCREEN = '(max-width: 640px)';

/** Whether a media query matches now; follows its changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', listener);
      return () => {
        media.removeEventListener('change', listener);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
