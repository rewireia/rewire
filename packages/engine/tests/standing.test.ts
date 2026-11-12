import { describe, expect, it } from 'vitest';

import { standingOf } from '../src/index.ts';

import { dataset, scoredOccupation } from './support/builders.ts';

/** Twenty scored occupations with mean scores 0.01, 0.02 … 0.20. */
const TWENTY = dataset(
  Array.from({ length: 20 }, (_, index) =>
    scoredOccupation(String(2000 + index), `Occupation ${index + 1}`, [0.5], (index + 1) / 100),
  ),
);

/** The mean score of the occupation that has `above` occupations of TWENTY above it. */
const withAbove = (above: number) => (20 - above) / 100;

describe('standingOf', () => {
  it('counts the occupations with a strictly higher mean score, out of all of them', () => {
    expect(standingOf(TWENTY, withAbove(5))).toEqual({ moreExposed: 5, outOf: 20 });
  });

  it('puts none above the highest mean score and all the others above the lowest', () => {
    expect(standingOf(TWENTY, withAbove(0)).moreExposed).toBe(0);
    expect(standingOf(TWENTY, withAbove(19)).moreExposed).toBe(19);
  });

  it('does not count occupations with the same mean score as above', () => {
    const tied = dataset([
      scoredOccupation('2511', 'Systems analysts', [0.5], 0.5),
      scoredOccupation('2512', 'Software developers', [0.5], 0.5),
    ]);

    expect(standingOf(tied, 0.5).moreExposed).toBe(0);
  });
});
