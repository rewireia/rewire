import { describe, expect, it } from 'vitest';

import {
  arcPath,
  bandAt,
  bandPaths,
  gaugeFraction,
  gaugeReading,
  pointAt,
  type GaugeBand,
} from '../src/components/RadialGaugeArc.ts';

const BANDS: readonly GaugeBand[] = [
  { from: 0, to: 25, color: 'var(--band-very-low)', label: 'Very low' },
  { from: 25, to: 50, color: 'var(--band-low)', label: 'Low' },
  { from: 50, to: 75, color: 'var(--band-medium)', label: 'Medium' },
  { from: 75, to: 100, color: 'var(--band-high)', label: 'High' },
];

describe('radial gauge geometry', () => {
  it('places a value on its scale and keeps it inside', () => {
    expect(gaugeFraction(50, 0, 100)).toBe(0.5);
    expect(gaugeFraction(15, 10, 20)).toBe(0.5);
    expect(gaugeFraction(-5, 0, 100)).toBe(0);
    expect(gaugeFraction(140, 0, 100)).toBe(1);
  });

  it('gives no fraction for a broken scale', () => {
    expect(gaugeFraction(5, 10, 10)).toBe(0);
    expect(gaugeFraction(Number.NaN, 0, 100)).toBe(0);
  });

  it('runs from the left end over the top to the right end', () => {
    expect(pointAt(0)).toEqual({ x: 16, y: 100 });
    expect(pointAt(0.5)).toEqual({ x: 100, y: 16 });
    expect(pointAt(1)).toEqual({ x: 184, y: 100 });
  });

  it('draws the dial clockwise with the small arc', () => {
    expect(arcPath(0, 1)).toBe('M 16 100 A 84 84 0 0 1 184 100');
  });

  it('finds the band of a value, the maximum in the last one', () => {
    expect(bandAt(BANDS, 0)?.label).toBe('Very low');
    expect(bandAt(BANDS, 25)?.label).toBe('Low');
    expect(bandAt(BANDS, 74.9)?.label).toBe('Medium');
    expect(bandAt(BANDS, 100)?.label).toBe('High');
    expect(bandAt(BANDS, -1)).toBeUndefined();
  });

  it('leaves a gap between bands but not at the ends of the dial', () => {
    const paths = bandPaths(BANDS, 0, 100);
    expect(paths).toHaveLength(4);
    expect(paths[0]?.d.startsWith('M 16 100 ')).toBe(true);
    expect(paths[3]?.d.endsWith(' 184 100')).toBe(true);
    expect(paths[1]?.d.startsWith('M 16 100 ')).toBe(false);
  });

  it('draws one band over the whole dial', () => {
    const [only] = bandPaths([{ from: 0, to: 1, color: 'red', label: 'All' }], 0, 1);
    expect(only?.d).toBe('M 16 100 A 84 84 0 0 1 184 100');
  });
});

describe('radial gauge reading', () => {
  const scale = { min: 0, max: 100, bands: BANDS };

  it('has nothing to show without a value, never a false zero', () => {
    expect(gaugeReading({ ...scale, value: null })).toBeNull();
    expect(gaugeReading({ ...scale, value: Number.NaN })).toBeNull();
  });

  it('writes the rounded figure, its band and the sentence by default', () => {
    expect(gaugeReading({ ...scale, value: 61.6, unit: '/100' })).toEqual({
      value: 61.6,
      fraction: 0.616,
      band: BANDS[2],
      figure: '62',
      caption: 'Medium',
      valueText: '62/100, Medium',
    });
  });

  it('keeps the figure, caption and sentence it is given, and the value inside the scale', () => {
    const reading = gaugeReading({
      ...scale,
      value: 130,
      display: '3 of 3',
      caption: 'Plan finished',
      valueText: 'Three of three courses completed',
    });
    expect(reading).toMatchObject({
      value: 100,
      fraction: 1,
      figure: '3 of 3',
      caption: 'Plan finished',
      valueText: 'Three of three courses completed',
    });
  });
});
