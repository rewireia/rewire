import { useQuery } from '@tanstack/react-query';

import { api, STATIC } from './instance.ts';

/** The library in one language; it changes only with a release, so it is read once a visit. */
export function useLibrary(language: 'en' | 'es') {
  return useQuery({
    queryKey: ['library', language],
    queryFn: ({ signal }) => api.library(language, signal),
    ...STATIC,
  });
}
