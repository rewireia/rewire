import type { ActiveOffer, Region } from '@rewire/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { beaconKey } from '../features/offers/offer-terms.ts';
import { useRunning } from '../features/offers/use-running.ts';

import { api } from './instance.ts';

/** How often a page that shows the offer asks again, besides when the window regains focus. */
const OFFER_REFRESH_MS = 3 * 60_000;

/** An answer this recent is not asked for again on focus. */
const OFFER_FRESH_MS = 30_000;

export type RunningOffer = NonNullable<ActiveOffer['offer']>;

/**
 * The discount running in the region, or `null`. It is read again on focus and every few
 * minutes; at its end it stops showing at once, without waiting for the server. Whenever it
 * starts, changes or ends, the catalogue is read again, so every price shown is the server's.
 */
export function useActiveOffer(region: Region): RunningOffer | null {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['active-offer', region],
    queryFn: ({ signal }) => api.activeOffer(region, signal),
    refetchOnWindowFocus: true,
    refetchInterval: OFFER_REFRESH_MS,
    staleTime: OFFER_FRESH_MS,
  });
  const offer = query.data?.offer ?? null;
  const running = useRunning(offer?.endsAt ?? null);
  const live = offer !== null && running ? offer : null;
  const key = live === null ? null : beaconKey(live);
  const known = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (known.current !== undefined && known.current !== key) {
      void client.invalidateQueries({ queryKey: ['course-catalogue'] });
    }
    known.current = key;
  }, [client, key]);
  return live;
}
