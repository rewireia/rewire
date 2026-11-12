import { regionInsightsSchema, type RegionInsights } from '@rewire/contracts';
import type { ExposureDataset, RegionalClassification } from '@rewire/data';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  employmentInsights,
  indexInsights,
  majorGroupInsights,
  payInsights,
} from '../src/modules/insights/aggregates.ts';
import { readSeries, type ScoredUnitGroups } from '../src/modules/insights/series.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const SOURCE = {
  id: 'test',
  title: 'Test source',
  publisher: 'Test',
  version: '1',
  url: 'https://example.org/',
  retrievedOn: '2026-11-11',
};

function unitGroup(isco08: string, meanScore: number) {
  return {
    isco08,
    title: `Group ${isco08}`,
    majorGroup: isco08.charAt(0),
    meanScore,
    standardDeviation: 0.1,
    gradient: meanScore >= 0.5 ? ('gradient-2' as const) : ('not-exposed' as const),
    tasks: [],
  };
}

const EXPOSURE = {
  majorGroups: [
    { code: '2', title: 'Professionals' },
    { code: '4', title: 'Clerical support workers' },
  ],
  occupations: [unitGroup('2511', 0.4), unitGroup('2512', 0.6), unitGroup('4132', 0.7)],
} as unknown as ExposureDataset;

const SCORED: ScoredUnitGroups = {
  scoreOf: new Map(EXPOSURE.occupations.map((group) => [group.isco08, group.meanScore])),
  titleOfMajorGroup: new Map(EXPOSURE.majorGroups.map((group) => [group.code, group.title])),
};

const ONET = {
  region: 'us',
  scheme: { name: 'O*NET-SOC', version: '31', publisher: 'Test' },
  languages: ['en'],
  occupations: [
    { code: '15-1252.00', title: 'Software Developers', iscoLinks: [link('2512')], titles: [] },
    { code: '15-1252.01', title: 'Web Developers', iscoLinks: [link('2511')], titles: [] },
    { code: '43-9021.00', title: 'Data Entry Keyers', iscoLinks: [link('4132')], titles: [] },
    { code: '99-9999.00', title: 'Unbridged', iscoLinks: [], titles: [] },
  ],
} as RegionalClassification;

function link(isco08: string) {
  return { isco08, basis: 'exact-match' as const, support: 1 };
}

const JOBS = {
  level: 'regional-occupation' as const,
  period: 'May 2025',
  source: 'test',
  population: 'Jobs',
  counts: 'jobs' as const,
  byCode: { '15-1252': 300, '43-9021': 100, '99-9999': 50 },
};

describe('reading a series through the unit groups', () => {
  it('averages the unit groups an SOC occupation covers and leaves out what has no bridge', () => {
    const items = readSeries(JOBS, ONET, SCORED);
    expect(items).toEqual([
      {
        code: '15-1252',
        title: 'Software Developers',
        value: 300,
        meanScore: 0.5,
        majorGroup: '2',
      },
      { code: '43-9021', title: 'Data Entry Keyers', value: 100, meanScore: 0.7, majorGroup: '4' },
    ]);
  });

  it('reads an ISCO-08 group as every scored unit group inside it', () => {
    const series = { ...JOBS, level: 'isco-1-digit' as const, byCode: { '2': 10, '9': 5 } };
    const items = readSeries(series, ONET, SCORED);
    expect(items).toEqual([
      { code: '2', title: 'Professionals', value: 10, meanScore: 0.5, majorGroup: '2' },
    ]);
  });
});

describe('the aggregates', () => {
  const items = readSeries(JOBS, ONET, SCORED);

  it('splits employment by band and weights the mean by the jobs', () => {
    const employment = employmentInsights(JOBS, items, SOURCE);
    expect(employment).toMatchObject({ total: 450, matched: 400, counts: 'jobs' });
    expect(employment?.meanScore).toBeCloseTo((300 * 0.5 + 100 * 0.7) / 400);
    expect(employment?.byBand).toEqual([
      { band: 'high', employed: 0, share: 0, groups: 0 },
      { band: 'medium', employed: 400, share: 1, groups: 2 },
      { band: 'low', employed: 0, share: 0, groups: 0 },
      { band: 'very-low', employed: 0, share: 0, groups: 0 },
    ]);
  });

  it('has no employment story when nothing reaches a scored unit group', () => {
    expect(employmentInsights(JOBS, [], SOURCE)).toBeNull();
  });

  it('counts the jobs of each major group out of those it can tell apart', () => {
    const groups = majorGroupInsights(EXPOSURE, items);
    expect(groups).toEqual([
      {
        code: '2',
        title: 'Professionals',
        meanScore: 0.5,
        unitGroups: 2,
        employed: 300,
        employedShare: 0.75,
      },
      {
        code: '4',
        title: 'Clerical support workers',
        meanScore: 0.7,
        unitGroups: 1,
        employed: 100,
        employedShare: 0.25,
      },
    ]);
    expect(majorGroupInsights(EXPOSURE, null)[0]).toMatchObject({
      employed: null,
      employedShare: null,
    });
  });

  it('splits pay at the median and needs at least two points', () => {
    const pay = { ...JOBS, currency: 'USD' as const, measure: 'median-annual' as const };
    expect(payInsights(pay, items, SOURCE)?.split).toEqual({
      medianPay: 200,
      above: { groups: 1, meanScore: 0.5 },
      below: { groups: 1, meanScore: 0.7 },
    });
    expect(payInsights(pay, items.slice(0, 1), SOURCE)).toBeNull();
  });

  it('ranks the index from the most exposed and counts each band', () => {
    const index = indexInsights(EXPOSURE, SOURCE);
    expect(index.mostExposed.map((group) => group.isco08)).toEqual(['4132', '2512', '2511']);
    expect(index.leastExposed.map((group) => group.isco08)).toEqual(['2511', '2512', '4132']);
    expect(index.byBand).toEqual([
      { band: 'high', unitGroups: 0 },
      { band: 'medium', unitGroups: 2 },
      { band: 'low', unitGroups: 1 },
      { band: 'very-low', unitGroups: 0 },
    ]);
  });
});

let api: TestApi;
let visitor: TestClient;

beforeAll(async () => {
  api = await createTestApi();
  visitor = api.client();
});

afterAll(async () => {
  await api.close();
});

async function insightsOf(region: string): Promise<RegionInsights> {
  return bodyOf(await visitor.get(`/api/regions/${region}/insights`), 200, regionInsightsSchema);
}

describe('GET /api/regions/:region/insights with the real bundle', () => {
  it('reads EU employment at two digits and pay by major group, each with its source', async () => {
    const insights = await insightsOf('eu');
    expect(insights.employment).toMatchObject({
      level: 'isco-2-digit',
      counts: 'people',
      source: { id: 'eurostat-lfsa-egai2d' },
    });
    expect(insights.pay).toMatchObject({
      level: 'isco-1-digit',
      measure: 'mean-monthly',
      currency: 'EUR',
      source: { id: 'eurostat-earn-ses22-48' },
    });
    expect(insights.pay?.points).toHaveLength(9);
    expect(insights.index.source).toMatchObject({
      id: 'ilo-genai-exposure',
      retrievedOn: '2026-11-11',
    });
  });

  it('reads US jobs and UK people by occupation, and covers most of each series', async () => {
    for (const [region, counts] of [
      ['us', 'jobs'],
      ['uk', 'people'],
    ] as const) {
      const { employment, pay } = await insightsOf(region);
      expect(employment).toMatchObject({ level: 'regional-occupation', counts });
      expect((employment?.matched ?? 0) / (employment?.total ?? 1)).toBeGreaterThan(0.9);
      expect(pay?.measure).toBe('median-annual');
    }
  });

  it('gives shares that add up and a mean inside the scale', async () => {
    for (const region of ['eu', 'us', 'uk']) {
      const { employment, majorGroups, index } = await insightsOf(region);
      const shares = employment?.byBand.reduce((sum, band) => sum + band.share, 0) ?? 0;
      expect(shares).toBeCloseTo(1);
      expect(majorGroups).toHaveLength(9);
      expect(index.unitGroups).toBe(index.byBand.reduce((sum, band) => sum + band.unitGroups, 0));
      expect(index.mostExposed[0]?.meanScore).toBeGreaterThan(
        index.leastExposed[0]?.meanScore ?? 1,
      );
    }
  });

  it('does not exist for an unknown region', async () => {
    await expectProblem(await visitor.get('/api/regions/xx/insights'), 404, 'not_found');
  });
});
