import { useEffect, useState } from 'react';

import { nextEnd } from './offer-terms.ts';

/** The longest delay a browser timer keeps; a later end is checked again when it fires. */
const LONGEST_TIMER_MS = 2 ** 31 - 1;

/** A little after the end, so that the check that follows finds it over. */
const PAST_END_MS = 50;

/**
 * The instant offers are read at. It moves on by itself whenever one of the offers ending at
 * `ends` ends, on the browser's clock and with no request, so the page stops showing it then.
 */
export function useOffersNow(ends: readonly string[]): number {
  const [now, setNow] = useState(() => Date.now());
  const next = nextEnd(ends, now);
  useEffect(() => {
    if (next === null) {
      return undefined;
    }
    const left = Date.parse(next) - Date.now() + PAST_END_MS;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
      },
      Math.min(Math.max(left, 0), LONGEST_TIMER_MS),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [next, now]);
  return now;
}

/** The same, for one offer; `null` is no offer. */
export function useOfferNow(endsAt: string | null): number {
  return useOffersNow(endsAt === null ? [] : [endsAt]);
}
