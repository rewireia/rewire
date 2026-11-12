import { describe, expect, it } from 'vitest';

import { labourContextSchema } from '../src/index.ts';

const EMPLOYMENT = {
  level: 'isco-2-digit',
  period: '2025',
  source: 'eurostat-lfsa-egai2d',
  population: 'People in employment',
  counts: 'people',
  byCode: { '25': 5488200 },
};

describe('labourContextSchema', () => {
  it('accepts a region with no series at all', () => {
    expect(labourContextSchema.parse({ region: 'uk' })).toEqual({ region: 'uk' });
  });

  it('rejects a code that does not have the shape of the level of its series', () => {
    const context = { region: 'eu', employment: { ...EMPLOYMENT, byCode: { '2512': 1 } } };

    expect(() => labourContextSchema.parse(context)).toThrow('2512 is not a code of level');
  });

  it('rejects a title for a code of another level', () => {
    const context = {
      region: 'eu',
      employment: { ...EMPLOYMENT, titles: { '2': 'Professionals' } },
    };

    expect(() => labourContextSchema.parse(context)).toThrow('2 is not a code of level');
  });

  it('rejects a figure that is not a whole, non-negative number', () => {
    for (const figure of [-1, 12.5]) {
      const context = { region: 'eu', employment: { ...EMPLOYMENT, byCode: { '25': figure } } };
      expect(() => labourContextSchema.parse(context)).toThrow();
    }
  });
});
