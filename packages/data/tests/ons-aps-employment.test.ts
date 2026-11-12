import { describe, expect, it } from 'vitest';

import type { CsvRecord } from '../pipeline/readers/csv.ts';
import { buildUkEmployment } from '../pipeline/steps/ons-aps-employment.ts';

const PERIOD = 'Jul 2025-Jun 2026';

function apsRow(name: string, value: string, status = 'A', period = PERIOD): CsvRecord {
  return { DATE_NAME: period, SOC2020_FULL_NAME: name, OBS_VALUE: value, OBS_STATUS: status };
}

const ROWS = [
  apsRow('2134 : Programmers and software development professionals', '557900'),
  apsRow('1111 : Chief executives and senior officials', '219900'),
  apsRow('2435 : Professional/Chartered company secretaries', '', 'B'),
];

describe('buildUkEmployment', () => {
  it('keeps the people in employment of each unit group, in code order', () => {
    const employment = buildUkEmployment(ROWS, 3);

    expect(Object.entries(employment.byCode)).toEqual([
      ['1111', 219900],
      ['2134', 557900],
    ]);
    expect(employment).toMatchObject({
      level: 'regional-occupation',
      period: PERIOD,
      source: 'ons-aps-employment',
      counts: 'people',
    });
  });

  it('leaves out a figure Nomis withholds, even when it carries a value', () => {
    const employment = buildUkEmployment([apsRow('7121 : Collector salespersons', '900', 'B')], 1);

    expect(employment.byCode).toEqual({});
  });

  it('fails on a response smaller than a complete one', () => {
    expect(() => buildUkEmployment(ROWS, 400)).toThrow(
      'the Nomis response holds 3 records; at least 400 were expected',
    );
  });

  it('fails on a response that mixes periods', () => {
    const mixed = [...ROWS, apsRow('8211 : Large goods vehicle drivers', '1', 'A', 'Jan 2025')];

    expect(() => buildUkEmployment(mixed, 1)).toThrow('the Nomis response covers 2 periods');
  });

  it('rejects a row that is not a unit group or whose value is not a count', () => {
    expect(() => buildUkEmployment([apsRow('213 : IT professionals', '1')], 1)).toThrow();
    expect(() => buildUkEmployment([apsRow('2134 : Programmers', '0.7')], 1)).toThrow();
  });
});
