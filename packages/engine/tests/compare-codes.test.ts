import { describe, expect, it } from 'vitest';

import { compareCodes } from '../src/text/compare-codes.ts';

describe('compareCodes', () => {
  it('orders codes by their code units, whatever the language of the machine', () => {
    const codes = ['b', '2512', 'a', 'B', '0110', '15-1252.00', 'A', '151252'];

    expect(codes.toSorted(compareCodes)).toEqual([
      '0110',
      '15-1252.00',
      '151252',
      '2512',
      'A',
      'B',
      'a',
      'b',
    ]);
  });

  it('gives 0 only for equal codes', () => {
    expect(compareCodes('2512', '2512')).toBe(0);
    expect(compareCodes('2512', '2513')).toBeLessThan(0);
    expect(compareCodes('2513', '2512')).toBeGreaterThan(0);
  });
});
