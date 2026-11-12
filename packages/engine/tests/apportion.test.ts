import { describe, expect, it } from 'vitest';

import { apportion } from '../src/index.ts';

/** A fixed sequence of pseudo-random weights, so every run checks the same cases. */
function weightSets(count: number): number[][] {
  let seed = 7;
  const next = () => {
    seed = (seed * 48_271) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  return Array.from({ length: count }, () =>
    Array.from({ length: 1 + Math.floor(next() * 6) }, () =>
      next() < 0.2 ? 0 : Math.round(next() * 1000) / 100,
    ),
  );
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

describe('apportion', () => {
  it('gives parts that always add up to the total', () => {
    for (const weights of weightSets(500)) {
      if (sum(weights) > 0) {
        expect(sum(apportion(weights, 100, 5)), weights.join(',')).toBe(100);
        expect(sum(apportion(weights, 60, 1)), weights.join(',')).toBe(60);
      }
    }
  });

  it('gives parts in whole steps', () => {
    for (const weights of weightSets(200)) {
      for (const part of apportion(weights, 100, 5)) {
        expect(part % 5).toBe(0);
      }
    }
  });

  it('never gives anything to a zero weight', () => {
    for (const weights of weightSets(500)) {
      apportion(weights, 100, 5).forEach((part, position) => {
        if (weights[position] === 0) {
          expect(part).toBe(0);
        }
      });
    }
  });

  it('gives every part zero when no weight is above zero', () => {
    expect(apportion([0, 0, 0], 100, 5)).toEqual([0, 0, 0]);
    expect(apportion([], 100, 5)).toEqual([]);
  });

  it('hands the steps left over to the largest remainders', () => {
    expect(apportion([2, 1], 100, 5)).toEqual([65, 35]);
    expect(apportion([1, 1, 2], 100, 5)).toEqual([25, 25, 50]);
  });

  it('breaks ties between equal remainders by position, the same way every time', () => {
    expect(apportion([1, 1, 1], 100, 5)).toEqual([35, 35, 30]);
    expect(apportion([1, 1, 1], 100, 5)).toEqual(apportion([1, 1, 1], 100, 5));
  });
});
