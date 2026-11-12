import { useMemo } from 'react';

import { usePreferences } from '../app/preferences.ts';

import { useMediaQuery } from './use-media-query.ts';

/**
 * Resolves colour tokens to the values the current theme gives them, for canvas drawing that
 * cannot read CSS custom properties. Recomputed when the theme or the system scheme changes.
 */
export function useTokenColors<K extends string>(
  tokens: Readonly<Record<K, string>>,
): Record<K, string> {
  const { theme } = usePreferences();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return useMemo(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolved = Object.fromEntries(
      Object.entries<string>(tokens).map(([name, token]) => {
        probe.style.color = `var(${token})`;
        return [name, getComputedStyle(probe).color];
      }),
    );
    probe.remove();
    // Built from the keys of `tokens`, so it has exactly those keys.
    return resolved as Record<K, string>;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the theme changes what tokens resolve to
  }, [tokens, theme, systemDark]);
}
