import { describe, expect, it } from 'vitest';

import { histogramOf } from '../src/features/explorer/histogram.ts';

describe('histogram of mean scores', () => {
  it('spreads scores over equal bins in points', () => {
    const bins = histogramOf([0, 0.04, 0.05, 0.61, 1], 20);
    expect(bins).toHaveLength(20);
    expect(bins[0]).toEqual({ from: 0, to: 5, count: 2, mine: false });
    expect(bins[1]?.count).toBe(1);
    expect(bins[12]?.count).toBe(1);
    expect(bins[19]).toEqual({ from: 95, to: 100, count: 1, mine: false });
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
  });

  it('marks the bin of the person’s occupation', () => {
    const bins = histogramOf([0.3, 0.61], 20, 0.61);
    expect(bins.filter((bin) => bin.mine).map((bin) => bin.from)).toEqual([60]);
  });
});
