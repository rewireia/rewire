import type { EmploymentSeries, LabourContext, PaySeries } from '@rewire/data';
import { describe, expect, it } from 'vitest';

import { labourFigureFor, occupationLabourOf } from '../src/index.ts';

const US_EMPLOYMENT: EmploymentSeries = {
  level: 'regional-occupation',
  period: 'May 2025',
  source: 'bls-oews',
  population: 'Wage and salary jobs',
  counts: 'jobs',
  byCode: { '43-3051': 153140, '2134': 557900 },
};

const EU_EMPLOYMENT: EmploymentSeries = {
  level: 'isco-2-digit',
  period: '2025',
  source: 'eurostat-lfsa-egai2d',
  population: 'People in employment',
  counts: 'people',
  byCode: { '43': 9000000, '25': 5488200 },
  titles: { '43': 'Numerical and material recording clerks', '63': 'Subsistence farmers' },
};

const EU_PAY: PaySeries = {
  level: 'isco-1-digit',
  period: '2022',
  source: 'eurostat-earn-ses22-48',
  population: 'Employees',
  currency: 'EUR',
  measure: 'mean-monthly',
  byCode: { '4': 2590 },
  titles: { '4': 'Clerical support workers' },
};

const PAYROLL = { occupationCode: '43-3051.00', isco08: '4313' };

describe('labourFigureFor', () => {
  it('finds an O*NET occupation under the SOC occupation its code begins with', () => {
    expect(labourFigureFor(US_EMPLOYMENT, PAYROLL)).toEqual({
      value: 153140,
      level: 'regional-occupation',
      period: 'May 2025',
      source: 'bls-oews',
      population: 'Wage and salary jobs',
      groupCode: '43-3051',
    });
  });

  it('finds any other regional occupation under its own code', () => {
    const figure = labourFigureFor(US_EMPLOYMENT, { occupationCode: '2134', isco08: '2512' });

    expect(figure?.value).toBe(557900);
  });

  it('finds an occupation under the ISCO-08 sub-major group of its unit group, with its title', () => {
    const figure = labourFigureFor(EU_EMPLOYMENT, { occupationCode: '4313.1', isco08: '4313' });

    expect(figure).toMatchObject({
      value: 9000000,
      level: 'isco-2-digit',
      groupCode: '43',
      groupTitle: 'Numerical and material recording clerks',
    });
  });

  it('finds an occupation under the ISCO-08 major group of its unit group', () => {
    expect(labourFigureFor(EU_PAY, PAYROLL)).toMatchObject({ value: 2590, groupCode: '4' });
  });

  it('gives nothing when the series has no figure for the group', () => {
    expect(labourFigureFor(US_EMPLOYMENT, { occupationCode: '15-1252.00' })).toBeUndefined();
    expect(labourFigureFor(EU_EMPLOYMENT, { occupationCode: '6330.1', isco08: '6330' })).toBe(
      undefined,
    );
  });

  it('gives nothing by ISCO-08 group to an occupation without a whole unit group code', () => {
    for (const isco08 of [undefined, '4', '43', '431', 'abcd']) {
      expect(labourFigureFor(EU_EMPLOYMENT, { occupationCode: '4313.1', isco08 })).toBeUndefined();
      expect(labourFigureFor(EU_PAY, { occupationCode: '4313.1', isco08 })).toBeUndefined();
    }
  });
});

describe('occupationLabourOf', () => {
  it('gives employment and pay, with what each figure counts and measures', () => {
    const context: LabourContext = { region: 'eu', employment: EU_EMPLOYMENT, pay: EU_PAY };

    const labour = occupationLabourOf(context, { occupationCode: '4313.1', isco08: '4313' });

    expect(labour.employment).toMatchObject({ value: 9000000, counts: 'people' });
    expect(labour.pay).toMatchObject({ value: 2590, currency: 'EUR', measure: 'mean-monthly' });
  });

  it('leaves out a figure no series publishes', () => {
    expect(occupationLabourOf({ region: 'uk' }, PAYROLL)).toEqual({});
    expect(Object.keys(occupationLabourOf({ region: 'eu', pay: EU_PAY }, PAYROLL))).toEqual([
      'pay',
    ]);
  });
});
