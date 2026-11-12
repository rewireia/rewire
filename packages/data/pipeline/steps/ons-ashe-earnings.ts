import { z } from 'zod';

import type { PaySeries } from '../../src/index.ts';
import { ONS_EARNINGS } from '../labour-sources.ts';
import type { SheetRecord } from '../readers/spreadsheet.ts';

import { figuresByCode } from './labour-figures.ts';

/** The workbook, sheet and first column title of the table the step reads. */
export const ASHE_TABLE = {
  workbook: 'Table 14.7a   Annual pay - Gross',
  sheet: 'All',
  headerStartsWith: 'Description',
} as const;

/** ASHE measures annual pay over the tax year that ends on 5 April of the survey year. */
const PERIOD = 'Tax year to April 2026 (provisional)';

/** The ONS writes codes as text with a leading apostrophe, so `'2134` stays a code. */
const CODE = /^'?(\d{4})$/;

/**
 * A median cell. `x` (too unreliable), `..` (disclosive) and `:` (not available) mark a figure
 * the ONS does not publish: it is absent, never zero.
 */
const medianCellSchema = z
  .union([z.number().nonnegative(), z.enum(['x', '..', ':']), z.null()])
  .transform((cell) => (typeof cell === 'number' ? Math.round(cell) : undefined));

/** One row of the table: a group of any level, or a note below the table with no code. */
const asheRowSchema = z.object({
  Code: z.union([z.string(), z.number()]).nullable(),
  Median: medianCellSchema,
});

/**
 * Turns the ASHE table of gross annual pay for all employee jobs into the UK median annual pay
 * by SOC 2020 unit group. Rows of broader groups and the notes below the table are skipped.
 */
export function buildUkPay(records: readonly SheetRecord[]): PaySeries {
  const figures = records.flatMap((record): (readonly [string, number])[] => {
    const row = asheRowSchema.parse(record);
    const code = CODE.exec(String(row.Code ?? ''))?.[1];
    return code === undefined || row.Median === undefined ? [] : [[code, row.Median]];
  });
  return {
    level: 'regional-occupation',
    period: PERIOD,
    source: ONS_EARNINGS.id,
    population:
      'Employee jobs, full-time and part-time, on adult rates and held for more than a year',
    currency: 'GBP',
    measure: 'median-annual',
    byCode: figuresByCode(figures),
  };
}
