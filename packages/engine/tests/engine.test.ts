import { describe, expect, it } from 'vitest';

import { createEngine, exposureProfileOf } from '../src/index.ts';

import {
  bundle,
  classification,
  dataset,
  occupation,
  scoredOccupation,
} from './support/builders.ts';

const EXPOSURE = dataset([
  scoredOccupation('4313', 'Payroll clerks', [0.8, 0.7]),
  scoredOccupation('2512', 'Software developers', [0.6, 0.5, 0.4]),
]);
const PAYROLL = occupation(
  '43-3051.00',
  'Payroll and Timekeeping Clerks',
  ['4313'],
  ['Payroll Clerk'],
);
const BUNDLE = bundle(
  EXPOSURE,
  { us: classification('us', [PAYROLL]) },
  {
    us: {
      region: 'us',
      pay: {
        level: 'regional-occupation',
        period: 'May 2025',
        source: 'bls-oews',
        population: 'Wage and salary workers',
        currency: 'USD',
        measure: 'median-annual',
        byCode: { '43-3051': 58260 },
      },
    },
  },
);

describe('createEngine', () => {
  it('searches the classification of the region it is asked about', () => {
    const engine = createEngine(BUNDLE);

    expect(engine.searchOccupations('us', 'payroll clerk')[0]?.occupation).toBe(PAYROLL);
    expect(engine.searchOccupations('eu', 'payroll clerk')).toEqual([]);
  });

  it('answers a repeated search the same way', () => {
    const engine = createEngine(BUNDLE);

    expect(engine.searchOccupations('us', 'payroll', { limit: 1 })).toEqual(
      engine.searchOccupations('us', 'payroll', { limit: 1 }),
    );
  });

  it('finds an occupation by its code in its region only', () => {
    const engine = createEngine(BUNDLE);

    expect(engine.findOccupation('us', '43-3051.00')).toBe(PAYROLL);
    expect(engine.findOccupation('uk', '43-3051.00')).toBeUndefined();
  });

  it('gives the exposure profile of a scored unit group, and nothing for others', () => {
    const engine = createEngine(BUNDLE);

    expect(engine.exposureProfile('2512')).toEqual(exposureProfileOf(EXPOSURE, '2512'));
    expect(engine.exposureProfile('2512')).toBe(engine.exposureProfile('2512'));
    expect(engine.exposureProfile('0110')).toBeUndefined();
  });

  it('lists every scored unit group in code order, with its major group', () => {
    const engine = createEngine(BUNDLE);

    expect(engine.unitGroups()).toEqual([
      {
        isco08: '2512',
        title: 'Software developers',
        majorGroup: { code: '2', title: 'Professionals' },
        meanScore: 0.5,
        gradient: 'gradient-2',
        tasks: 3,
      },
      {
        isco08: '4313',
        title: 'Payroll clerks',
        majorGroup: { code: '4', title: 'Clerical support workers' },
        meanScore: 0.75,
        gradient: 'gradient-2',
        tasks: 2,
      },
    ]);
  });

  it('gives the labour context of an occupation from the statistics of its region only', () => {
    const engine = createEngine(BUNDLE);
    const keys = { occupationCode: '43-3051.00', isco08: '4313' };

    expect(engine.occupationLabour('us', keys)).toEqual({
      pay: {
        value: 58260,
        level: 'regional-occupation',
        period: 'May 2025',
        source: 'bls-oews',
        population: 'Wage and salary workers',
        groupCode: '43-3051',
        currency: 'USD',
        measure: 'median-annual',
      },
    });
    expect(engine.occupationLabour('uk', keys)).toEqual({});
  });
});
