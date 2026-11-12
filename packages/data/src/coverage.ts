import type { DataBundle } from './bundle.ts';
import type { Region, RegionalClassification } from './schema/classification.ts';

/** How much of a regional classification reaches a unit group the ILO has scored. */
export interface BridgeCoverage {
  readonly region: Region;
  readonly occupations: number;
  /** Occupations whose proposed link is a scored unit group. */
  readonly scoredOccupations: number;
  readonly titles: number;
  /** Job titles that reach a scored unit group, by their own code or their occupation's. */
  readonly scoredTitles: number;
}

/** Measures the bridge of every region against the exposure dataset of the bundle. */
export function measureBridgeCoverage(bundle: DataBundle): BridgeCoverage[] {
  const scored = new Set(bundle.exposure.occupations.map((occupation) => occupation.isco08));
  return Object.values(bundle.classifications).map((classification) =>
    coverageOf(classification, scored),
  );
}

function coverageOf(
  classification: RegionalClassification,
  scored: ReadonlySet<string>,
): BridgeCoverage {
  let scoredOccupations = 0;
  let titles = 0;
  let scoredTitles = 0;
  for (const occupation of classification.occupations) {
    const proposed = occupation.iscoLinks[0]?.isco08;
    const occupationIsScored = proposed !== undefined && scored.has(proposed);
    scoredOccupations += occupationIsScored ? 1 : 0;
    for (const title of occupation.titles) {
      titles += 1;
      const titleIsScored =
        title.isco08 === undefined ? occupationIsScored : scored.has(title.isco08);
      scoredTitles += titleIsScored ? 1 : 0;
    }
  }
  return {
    region: classification.region,
    occupations: classification.occupations.length,
    scoredOccupations,
    titles,
    scoredTitles,
  };
}
