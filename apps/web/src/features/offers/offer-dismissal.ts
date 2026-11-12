import { z } from 'zod';

import type { SafeStorage } from '../../app/storage.ts';

/** Where the beacons whose notice the learner put aside are kept. */
export const DISMISSED_KEY = 'rewire.offers.dismissed';

/** Only the latest few are kept: an older beacon is over long before. */
const KEPT = 12;

const storedKeys = z.array(z.string().max(120)).catch([]);

/** The keys kept in the storage, or none when it holds nothing readable. */
export function parseDismissed(stored: string | null): readonly string[] {
  if (stored === null) {
    return [];
  }
  try {
    return storedKeys.parse(JSON.parse(stored)).slice(-KEPT);
  } catch {
    return [];
  }
}

export interface OfferDismissals {
  readonly has: (key: string) => boolean;
  readonly add: (key: string) => void;
}

/**
 * The beacons whose notice was put aside with "Not now", kept in the given storage when there is
 * one and in memory for the visit when it is refused.
 */
export function createDismissals(storage: SafeStorage | null): OfferDismissals {
  let keys = parseDismissed(storage?.getItem(DISMISSED_KEY) ?? null);
  return {
    has: (key) => keys.includes(key),
    add: (key) => {
      if (keys.includes(key)) {
        return;
      }
      keys = [...keys, key].slice(-KEPT);
      storage?.setItem(DISMISSED_KEY, JSON.stringify(keys));
    },
  };
}
