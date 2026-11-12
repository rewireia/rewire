import { z } from 'zod';

import type { EmploymentSeries, PaySeries } from '../../src/index.ts';
import { BLS_OEWS } from '../labour-sources.ts';
import type { SheetRecord } from '../readers/spreadsheet.ts';

import { figuresByCode } from './labour-figures.ts';

/**
 * A figure cell of OEWS. `*`, `**`, `#` and `~` mark a figure that is not published or lies
 * above the top of the wage scale: it is absent, never zero.
 */
const figureCellSchema = z
  .union([z.number().nonnegative(), z.enum(['*', '**', '#', '~'])])
  .transform((cell) => (typeof cell === 'number' ? Math.round(cell) : undefined));

/** One row of the national workbook: one occupation, or one group of them. */
const oewsRowSchema = z.object({
  OCC_CODE: z.string().regex(/^\d{2}-\d{4}$/),
  O_GROUP: z.enum(['total', 'major', 'minor', 'broad', 'detailed']),
  TOT_EMP: figureCellSchema,
  A_MEDIAN: figureCellSchema,
});

export interface OewsStepResult {
  readonly employment: EmploymentSeries;
  readonly pay: PaySeries;
}

/**
 * Turns the national OEWS workbook into US employment and median annual wage by SOC
 * occupation. Only detailed occupations are kept: their codes are the first seven characters
 * of the O*NET-SOC codes of the classification, so each O*NET occupation finds its own.
 */
export function buildUsLabour(records: readonly SheetRecord[]): OewsStepResult {
  const rows = records
    .map((record) => oewsRowSchema.parse(record))
    .filter((row) => row.O_GROUP === 'detailed');
  const figures = (pick: (row: (typeof rows)[number]) => number | undefined) =>
    figuresByCode(
      rows.flatMap((row) => {
        const value = pick(row);
        return value === undefined ? [] : [[row.OCC_CODE, value] as const];
      }),
    );
  const shared = {
    level: 'regional-occupation',
    period: BLS_OEWS.version,
    source: BLS_OEWS.id,
  } as const;
  return {
    employment: {
      ...shared,
      population: 'Wage and salary jobs in all industries; the self-employed are not counted',
      counts: 'jobs',
      byCode: figures((row) => row.TOT_EMP),
    },
    pay: {
      ...shared,
      population:
        'Wage and salary workers in all industries; straight-time gross pay, without overtime',
      currency: 'USD',
      measure: 'median-annual',
      byCode: figures((row) => row.A_MEDIAN),
    },
  };
}
