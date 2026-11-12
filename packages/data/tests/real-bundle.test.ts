import { beforeAll, describe, expect, it } from 'vitest';

import { checkBundle } from '../pipeline/check-bundle.ts';
import {
  DEFAULT_BUNDLE_DIRECTORY,
  measureBridgeCoverage,
  type DataBundle,
  type Region,
} from '../src/index.ts';

/** Share of occupations of each region that must reach a scored unit group. */
const COVERAGE_FLOORS: Readonly<Record<Region, number>> = { eu: 0.97, us: 0.91, uk: 0.96 };

/**
 * Fewest occupations of each region with an employment figure: O*NET occupations in the US,
 * SOC 2020 unit groups in the UK and ISCO-08 sub-major groups in the EU.
 */
const LABOUR_FLOORS: Readonly<Record<Region, number>> = { eu: 40, us: 700, uk: 350 };

/** ASHE withholds the median of small unit groups, so fewer have pay than employment. */
const UK_PAY_FLOOR = 330;

describe('the bundle shipped with the package', () => {
  let bundle: DataBundle;

  beforeAll(async () => {
    bundle = await checkBundle(DEFAULT_BUNDLE_DIRECTORY);
  });

  it('holds the 427 unit groups and 3,265 tasks of the ILO index', () => {
    const { occupations } = bundle.exposure;
    const tasks = occupations.reduce((count, occupation) => count + occupation.tasks.length, 0);

    expect(occupations).toHaveLength(427);
    expect(tasks).toBe(3265);
  });

  it('gives employment and median annual wage for payroll clerks in the US', () => {
    const { employment, pay } = bundle.labour.us;

    expect(employment?.byCode['43-3051']).toBeGreaterThan(50_000);
    expect(pay?.byCode['43-3051']).toBeGreaterThan(30_000);
    expect(pay?.byCode['43-3051']).toBeLessThan(90_000);
  });

  it('gives employment for programmers in the UK', () => {
    expect(bundle.labour.uk.employment?.byCode['2134']).toBeGreaterThan(100_000);
  });

  it('gives EU employment for ICT professionals and mean monthly pay for professionals', () => {
    const { employment, pay } = bundle.labour.eu;

    expect(employment?.byCode['25']).toBeGreaterThan(1_000_000);
    expect(pay?.byCode['2']).toBeGreaterThan(2_000);
    expect(pay?.byCode['2']).toBeLessThan(8_000);
  });

  it('keeps the labour figures of each region in the file named after it', () => {
    const { us, uk, eu } = bundle.labour;

    expect([us.region, uk.region, eu.region]).toEqual(['us', 'uk', 'eu']);
  });

  it('gives employment and pay for the occupations of each region above its floor', () => {
    const { eu } = bundle.labour;
    const reached = (
      region: Region,
      series: 'employment' | 'pay',
      codeOf: (code: string) => string,
    ) =>
      bundle.classifications[region].occupations.filter(
        (occupation) =>
          bundle.labour[region][series]?.byCode[codeOf(occupation.code)] !== undefined,
      ).length;
    const socOf = (code: string) => code.slice(0, 7);

    expect(reached('us', 'employment', socOf)).toBeGreaterThanOrEqual(LABOUR_FLOORS.us);
    expect(reached('us', 'pay', socOf)).toBeGreaterThanOrEqual(LABOUR_FLOORS.us);
    expect(reached('uk', 'employment', (code) => code)).toBeGreaterThanOrEqual(LABOUR_FLOORS.uk);
    expect(reached('uk', 'pay', (code) => code)).toBeGreaterThanOrEqual(UK_PAY_FLOOR);
    expect(Object.keys(eu.employment?.byCode ?? {}).length).toBeGreaterThanOrEqual(
      LABOUR_FLOORS.eu,
    );
    expect(Object.keys(eu.pay?.byCode ?? {})).toHaveLength(10);
  });

  it('traces every labour series to a source of the manifest', () => {
    const sources = new Set(bundle.manifest.sources.map((source) => source.id));
    const series = Object.values(bundle.labour).flatMap(({ employment, pay }) => [employment, pay]);

    for (const { source } of series.filter((entry) => entry !== undefined)) {
      expect(sources).toContain(source);
    }
  });

  it('bridges each region to scored unit groups above its floor', () => {
    for (const coverage of measureBridgeCoverage(bundle)) {
      const share = coverage.scoredOccupations / coverage.occupations;
      expect(share, coverage.region).toBeGreaterThanOrEqual(COVERAGE_FLOORS[coverage.region]);
    }
  });
});
