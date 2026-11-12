import type { EmploymentInsights, MajorGroupInsight, PayInsights } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import {
  bandOfScore,
  exposureBands,
  lowerShare,
  mostExposedGroup,
  payTrend,
  reachesHigh,
  upperShare,
} from '../src/features/explorer/story/story.ts';

const SOURCE = {
  id: 'test',
  title: 'Test',
  publisher: 'Test',
  version: '1',
  url: 'https://example.org/',
  retrievedOn: '2026-11-11',
};

const EMPLOYMENT: EmploymentInsights = {
  source: SOURCE,
  level: 'isco-2-digit',
  counts: 'people',
  period: '2025',
  population: 'People',
  total: 100,
  matched: 100,
  meanScore: 0.32,
  byBand: [
    { band: 'high', employed: 0, share: 0, groups: 0 },
    { band: 'medium', employed: 12, share: 0.12, groups: 5 },
    { band: 'low', employed: 47, share: 0.47, groups: 15 },
    { band: 'very-low', employed: 41, share: 0.41, groups: 19 },
  ],
};

function group(code: string, meanScore: number): MajorGroupInsight {
  return { code, title: code, meanScore, unitGroups: 1, employed: null, employedShare: null };
}

function pay(above: number, below: number): PayInsights {
  return {
    source: SOURCE,
    level: 'isco-1-digit',
    currency: 'EUR',
    measure: 'mean-monthly',
    period: '2022',
    population: 'Employees',
    points: [],
    split: {
      medianPay: 2404,
      above: { groups: 4, meanScore: above },
      below: { groups: 5, meanScore: below },
    },
  };
}

describe('the data story of a region', () => {
  it('splits the employment counted at a mean score of 50', () => {
    expect(lowerShare(EMPLOYMENT)).toBeCloseTo(0.88);
    expect(upperShare(EMPLOYMENT)).toBeCloseTo(0.12);
    expect(reachesHigh(EMPLOYMENT)).toBe(false);
  });

  it('finds the most exposed major group, the first one on a tie', () => {
    expect(mostExposedGroup([group('1', 0.36), group('4', 0.54), group('5', 0.54)])?.code).toBe(
      '4',
    );
    expect(mostExposedGroup([])).toBeNull();
  });

  it('compares the two halves of pay in whole points', () => {
    expect(payTrend(pay(0.41, 0.19))).toBe('higher');
    expect(payTrend(pay(0.2, 0.3))).toBe('lower');
    expect(payTrend(pay(0.301, 0.299))).toBe('equal');
  });

  it('bands a mean score by the ILO thresholds', () => {
    expect([0.1, 0.25, 0.5, 0.75].map(bandOfScore)).toEqual(['very-low', 'low', 'medium', 'high']);
  });

  it('draws the four bands on a gauge from 0 to 100, named in the language', () => {
    const bands = exposureBands((band) => band.toUpperCase());
    expect(bands.map(({ from, to }) => [from, to])).toEqual([
      [0, 25],
      [25, 50],
      [50, 75],
      [75, 100],
    ]);
    expect(bands[3]).toEqual({ from: 75, to: 100, color: 'var(--band-high)', label: 'HIGH' });
  });
});
