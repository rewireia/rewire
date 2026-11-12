import { REGION_PROFILES } from '@rewire/content';
import { regionSchema, type RegionList, type RegionSummary } from '@rewire/contracts';
import { measureBridgeCoverage, type BridgeCoverage, type DataBundle } from '@rewire/data';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';

/**
 * The regions Rewire serves and what changes with each: classification, currency, AI
 * skills framework and the case for an employer to pay. Worked out once, at start-up,
 * because the bundle does not change while the server runs.
 */
export function regionRoutes(bundle: DataBundle): Hono<HttpEnvironment> {
  const coverage = new Map(measureBridgeCoverage(bundle).map((entry) => [entry.region, entry]));
  const list: RegionList = {
    regions: regionSchema.options.map((region) => {
      const measured = coverage.get(region);
      if (measured === undefined) {
        throw new Error(`the data bundle has no classification for region ${region}`);
      }
      return summaryOf(region, bundle, measured);
    }),
  };
  return new Hono<HttpEnvironment>().get('/regions', (context) => context.json(list));
}

function summaryOf(
  region: RegionSummary['region'],
  bundle: DataBundle,
  coverage: BridgeCoverage,
): RegionSummary {
  const profile = REGION_PROFILES[region];
  const { scheme, languages } = bundle.classifications[region];
  // Every occupation's official title is a job title too, and it reaches a scored unit
  // group exactly when its occupation does.
  const jobTitles = coverage.occupations + coverage.titles;
  const scoredTitles = coverage.scoredOccupations + coverage.scoredTitles;
  return {
    region,
    name: profile.name,
    currency: profile.currency,
    locale: profile.locale,
    classification: {
      name: scheme.name,
      version: scheme.version,
      publisher: scheme.publisher,
      summary: profile.classification.summary,
      occupations: coverage.occupations,
      jobTitles,
      languages: [...languages],
      scoredTitleShare: jobTitles === 0 ? 0 : scoredTitles / jobTitles,
    },
    aiSkillsFramework: { ...profile.aiSkillsFramework },
    employerCase: { ...profile.employerCase, source: { ...profile.employerCase.source } },
  };
}
