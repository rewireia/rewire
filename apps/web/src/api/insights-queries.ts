import type { Region } from '@rewire/contracts';
import { useQuery } from '@tanstack/react-query';

import { api, STATIC } from './instance.ts';

/** The data story of a region; it changes only with a data release, so it is read once a visit. */
export function useRegionInsights(region: Region) {
  return useQuery({
    queryKey: ['insights', region],
    queryFn: ({ signal }) => api.insights(region, signal),
    ...STATIC,
  });
}
