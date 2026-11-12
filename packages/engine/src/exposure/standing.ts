import type { ExposureDataset } from '@rewire/data';

/**
 * Where a unit group stands among all the unit groups the ILO has scored. It is a count
 * and nothing more: Rewire adds no category of its own to the one the ILO publishes.
 */
export interface Standing {
  /** Scored unit groups with a higher mean score. */
  readonly moreExposed: number;
  /** Every scored unit group, this one included. */
  readonly outOf: number;
}

/** Ranks a mean score against the mean scores of every scored unit group. */
export function standingOf(dataset: ExposureDataset, meanScore: number): Standing {
  return {
    moreExposed: dataset.occupations.filter((other) => other.meanScore > meanScore).length,
    outOf: dataset.occupations.length,
  };
}
