import type { InsightSource, RegionInsights } from '@rewire/contracts';
import type { BundleManifest, DataBundle, Region } from '@rewire/data';

import {
  employmentInsights,
  indexInsights,
  majorGroupInsights,
  payInsights,
} from './aggregates.ts';
import { readSeries, type ScoredUnitGroups } from './series.ts';

const ILO_SOURCE = 'ilo-genai-exposure';

/** The data story of each region, worked out from the bundle the first time it is asked for. */
export interface InsightsService {
  insightsOf(region: Region): RegionInsights;
}

export function createInsightsService(bundle: DataBundle): InsightsService {
  const sourceOf = sourceLookup(bundle.manifest);
  const scored: ScoredUnitGroups = {
    scoreOf: new Map(bundle.exposure.occupations.map((group) => [group.isco08, group.meanScore])),
    titleOfMajorGroup: new Map(
      bundle.exposure.majorGroups.map((group) => [group.code, group.title]),
    ),
  };
  const index = indexInsights(bundle.exposure, sourceOf(ILO_SOURCE));
  const cache = new Map<Region, RegionInsights>();

  function build(region: Region): RegionInsights {
    const { employment, pay } = bundle.labour[region];
    const classification = bundle.classifications[region];
    const employed = employment && readSeries(employment, classification, scored);
    const paid = pay && readSeries(pay, classification, scored);
    return {
      region,
      index,
      majorGroups: majorGroupInsights(bundle.exposure, employed ?? null),
      employment:
        employment && employed
          ? employmentInsights(employment, employed, sourceOf(employment.source))
          : null,
      pay: pay && paid ? payInsights(pay, paid, sourceOf(pay.source)) : null,
    };
  }

  return {
    insightsOf(region) {
      const known = cache.get(region);
      if (known !== undefined) {
        return known;
      }
      const built = build(region);
      cache.set(region, built);
      return built;
    },
  };
}

function sourceLookup(manifest: BundleManifest): (id: string) => InsightSource {
  const sources = new Map(manifest.sources.map((source) => [source.id, source]));
  return (id) => {
    const source = sources.get(id);
    if (source === undefined) {
      throw new Error(`the bundle manifest has no source ${id}`);
    }
    const { title, publisher, version, url, retrievedOn } = source;
    return { id, title, publisher, version, url, retrievedOn };
  };
}
