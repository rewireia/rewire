import type { Reading, Region } from '@rewire/contracts';

/** How many readings the overview suggests. */
const READINGS_SHOWN = 3;

/**
 * Readings of the region first, then those that apply everywhere; the newest first within each,
 * so the suggestion is the same on every visit.
 */
export function readingsFor(readings: readonly Reading[], region: Region): readonly Reading[] {
  const rank = (reading: Reading) => (reading.scope === region ? 0 : 1);
  return readings
    .filter((reading) => reading.scope === region || reading.scope === 'global')
    .sort(
      (left, right) =>
        rank(left) - rank(right) || right.year - left.year || left.id.localeCompare(right.id),
    )
    .slice(0, READINGS_SHOWN);
}
