import { describe, expect, it } from 'vitest';

import type { Cell, SheetRecord } from '../pipeline/readers/spreadsheet.ts';
import { buildUkPay } from '../pipeline/steps/ons-ashe-earnings.ts';

function asheRow(description: string, code: string | number | null, median: Cell): SheetRecord {
  return { Description: description, Code: code, Median: median };
}

describe('buildUkPay', () => {
  it('keeps the rounded median of each unit group, skipping broader groups', () => {
    const pay = buildUkPay([
      asheRow('All employees', null, 34229.1),
      asheRow('Professional occupations', "'2", 45000),
      asheRow('Information technology professionals', "'213", 55000),
      asheRow('Programmers and software development professionals', "'2134", 58770.4),
      asheRow('Chief executives and senior officials', 1111, 60000.5),
    ]);

    expect(Object.entries(pay.byCode)).toEqual([
      ['1111', 60001],
      ['2134', 58770],
    ]);
    expect(pay).toMatchObject({
      level: 'regional-occupation',
      source: 'ons-ashe-table-14',
      currency: 'GBP',
      measure: 'median-annual',
    });
  });

  it('leaves out a median the ONS does not publish, never zero', () => {
    const pay = buildUkPay([
      asheRow('Elected officers and representatives', "'1112", 'x'),
      asheRow('Protective service occupations', "'3311", '..'),
      asheRow('Not elsewhere classified', "'9269", ':'),
      asheRow('Leisure and theme park attendants', "'9267", null),
    ]);

    expect(pay.byCode).toEqual({});
  });

  it('skips the notes below the table', () => {
    const pay = buildUkPay([asheRow('Source: Annual Survey of Hours and Earnings', null, null)]);

    expect(pay.byCode).toEqual({});
  });

  it('rejects a median that is neither a figure nor a marker of the ONS', () => {
    expect(() => buildUkPay([asheRow('Programmers', "'2134", 'n/a')])).toThrow();
  });
});
