import type { DataBundle, ExposureGradient, Region, RegionalOccupation } from '@rewire/data';

import { exposureProfileOf, majorGroupOf, type ExposureProfile } from './exposure/profile.ts';
import { occupationLabourOf, type OccupationLabour } from './labour/context.ts';
import type { OccupationKeys } from './labour/figure.ts';
import {
  searchOccupations,
  type OccupationMatch,
  type SearchOptions,
} from './occupation/search.ts';
import { buildTitleIndex, type TitleIndex } from './occupation/title-index.ts';
import { compareCodes } from './text/compare-codes.ts';

/** One scored unit group in a line, for lists that compare unit groups. */
export interface UnitGroupSummary {
  readonly isco08: string;
  readonly title: string;
  readonly majorGroup: { readonly code: string; readonly title: string };
  readonly meanScore: number;
  readonly gradient: ExposureGradient;
  readonly tasks: number;
}

/** The engine over one data bundle: every question the product asks of the data. */
export interface Engine {
  /** Occupations of a region whose titles match what a person wrote. */
  searchOccupations(region: Region, query: string, options?: SearchOptions): OccupationMatch[];
  /** An occupation by its code in the classification of its region. */
  findOccupation(region: Region, code: string): RegionalOccupation | undefined;
  /** The exposure profile of an ISCO-08 unit group, if the ILO has scored it. */
  exposureProfile(isco08: string): ExposureProfile | undefined;
  /** Every scored unit group, in code order. */
  unitGroups(): readonly UnitGroupSummary[];
  /** Employment and pay of an occupation of a region, as far as they are published. */
  occupationLabour(region: Region, keys: OccupationKeys): OccupationLabour;
}

/**
 * Prepares the engine. Nothing is read or fetched: the bundle is already in memory, and
 * the search index of a region is built the first time that region is searched.
 */
export function createEngine(bundle: DataBundle): Engine {
  const indexes = new Map<Region, TitleIndex>();
  const occupations = new Map<Region, ReadonlyMap<string, RegionalOccupation>>();
  const profiles = new Map<string, ExposureProfile | undefined>();
  const summaries: readonly UnitGroupSummary[] = bundle.exposure.occupations
    .map((occupation) => ({
      isco08: occupation.isco08,
      title: occupation.title,
      majorGroup: majorGroupOf(bundle.exposure, occupation),
      meanScore: occupation.meanScore,
      gradient: occupation.gradient,
      tasks: occupation.tasks.length,
    }))
    .toSorted((a, b) => compareCodes(a.isco08, b.isco08));

  return {
    searchOccupations(region, query, options) {
      let index = indexes.get(region);
      if (index === undefined) {
        index = buildTitleIndex(bundle.classifications[region]);
        indexes.set(region, index);
      }
      return searchOccupations(index, query, options);
    },
    findOccupation(region, code) {
      let byCode = occupations.get(region);
      if (byCode === undefined) {
        byCode = new Map(
          bundle.classifications[region].occupations.map((occupation) => [
            occupation.code,
            occupation,
          ]),
        );
        occupations.set(region, byCode);
      }
      return byCode.get(code);
    },
    exposureProfile(isco08) {
      if (!profiles.has(isco08)) {
        profiles.set(isco08, exposureProfileOf(bundle.exposure, isco08));
      }
      return profiles.get(isco08);
    },
    unitGroups: () => summaries,
    occupationLabour: (region, keys) => occupationLabourOf(bundle.labour[region], keys),
  };
}
