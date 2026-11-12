import { describe, expect, it } from 'vitest';

import { readJsonStat } from '../pipeline/readers/json-stat.ts';

/** A JSON-stat dataset that varies along `isco08` only, as a fixed Eurostat query returns. */
function dataset(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: ['unit', 'isco08', 'time'],
    size: [1, 3, 1],
    value: { '0': 207172.7, '2': 5488.2 },
    status: { '1': 'u' },
    dimension: {
      unit: { category: { index: { THS_PER: 0 } } },
      isco08: {
        category: {
          index: { TOTAL: 0, OC25: 2, OC63: 1 },
          label: { TOTAL: 'Total', OC25: 'ICT professionals' },
        },
      },
      time: { category: { index: ['2025'] } },
    },
    ...overrides,
  };
}

describe('readJsonStat', () => {
  it('reads each category of the dimension in position order, with its value and flag', () => {
    expect(readJsonStat(dataset(), 'isco08').observations).toEqual([
      { code: 'TOTAL', label: 'Total', value: 207172.7, status: undefined },
      { code: 'OC63', label: 'OC63', value: undefined, status: 'u' },
      { code: 'OC25', label: 'ICT professionals', value: 5488.2, status: undefined },
    ]);
  });

  it('names the single category every other dimension was fixed to', () => {
    expect(readJsonStat(dataset(), 'isco08').fixed).toEqual({ unit: 'THS_PER', time: '2025' });
  });

  it('reads dense lists of values and flags', () => {
    const dense = dataset({ value: [1, null, 3], status: [null, 'u', null] });

    expect(readJsonStat(dense, 'isco08').observations.map((row) => row.value)).toEqual([
      1,
      undefined,
      3,
    ]);
  });

  it('refuses a dataset that varies along another dimension too', () => {
    const wide = dataset({ size: [1, 3, 2] });

    expect(() => readJsonStat(wide, 'isco08')).toThrow('does not vary along isco08 alone');
    expect(() => readJsonStat(dataset(), 'geo')).toThrow('does not vary along geo alone');
  });

  it('refuses what is not a JSON-stat dataset', () => {
    expect(() => readJsonStat({ error: 'not found' }, 'isco08')).toThrow();
  });
});
