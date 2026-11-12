import { describe, expect, it } from 'vitest';

import type { SheetRecord } from '../pipeline/readers/spreadsheet.ts';
import { buildUsLabour } from '../pipeline/steps/bls-oews.ts';

/** One row of the national OEWS workbook, a detailed occupation unless overridden. */
function oewsRow(
  code: string,
  employment: number | string,
  median: number | string,
  group = 'detailed',
): SheetRecord {
  return { OCC_CODE: code, O_GROUP: group, OCC_TITLE: code, TOT_EMP: employment, A_MEDIAN: median };
}

describe('buildUsLabour', () => {
  it('keeps the employment and median annual wage of detailed occupations only', () => {
    const { employment, pay } = buildUsLabour([
      oewsRow('00-0000', 155495730, 50980, 'total'),
      oewsRow('43-0000', 18000000, 47000, 'major'),
      oewsRow('43-3051', 153140, 58260),
      oewsRow('15-1252', 1700000, 133080.4),
    ]);

    expect(employment.byCode).toEqual({ '15-1252': 1700000, '43-3051': 153140 });
    expect(pay.byCode).toEqual({ '15-1252': 133080, '43-3051': 58260 });
  });

  it('leaves out a figure marked as unpublished or above the wage scale, never zero', () => {
    const { employment, pay } = buildUsLabour([
      oewsRow('27-2011', 45000, '*'),
      oewsRow('29-1211', 40000, '#'),
      oewsRow('45-2092', '**', 34000),
    ]);

    expect(employment.byCode).toEqual({ '27-2011': 45000, '29-1211': 40000 });
    expect(pay.byCode).toEqual({ '45-2092': 34000 });
  });

  it('says what the figures are and where they come from', () => {
    const { employment, pay } = buildUsLabour([oewsRow('43-3051', 153140, 58260)]);

    expect(employment).toMatchObject({
      level: 'regional-occupation',
      period: 'May 2025',
      source: 'bls-oews',
      counts: 'jobs',
    });
    expect(pay).toMatchObject({ currency: 'USD', measure: 'median-annual', source: 'bls-oews' });
  });

  it('rejects a row whose code or figure is not one OEWS publishes', () => {
    expect(() => buildUsLabour([oewsRow('43-305', 1, 1)])).toThrow();
    expect(() => buildUsLabour([oewsRow('43-3051', 'n/a', 1)])).toThrow();
  });

  it('fails when the workbook gives the same occupation twice', () => {
    expect(() =>
      buildUsLabour([oewsRow('43-3051', 153140, 58260), oewsRow('43-3051', 1, 1)]),
    ).toThrow('the source gives two figures for 43-3051');
  });
});
