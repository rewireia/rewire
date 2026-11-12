import { z } from 'zod';

import type { EmploymentSeries } from '../../src/index.ts';
import { NOMIS_EMPLOYMENT } from '../labour-sources.ts';
import type { CsvRecord } from '../readers/csv.ts';

import { figuresByCode, requireRecords } from './labour-figures.ts';

/** Nomis marks a published figure with `A`; any other status means it was withheld. */
const PUBLISHED = 'A';

/** One row of the Nomis response: one SOC 2020 unit group, named "2134 : Programmers and …". */
const apsRowSchema = z.object({
  DATE_NAME: z.string().min(1),
  SOC2020_FULL_NAME: z.string().regex(/^\d{4} : .+$/),
  OBS_VALUE: z.string(),
  OBS_STATUS: z.string().min(1),
});

/**
 * Turns the Nomis response of the Annual Population Survey into UK employment by SOC 2020
 * unit group. A figure the ONS suppresses as unreliable is left out, never set to zero.
 */
export function buildUkEmployment(
  records: readonly CsvRecord[],
  minimumRecords: number,
): EmploymentSeries {
  const rows = records.map((record) => apsRowSchema.parse(record));
  requireRecords('the Nomis response', rows.length, minimumRecords);
  const periods = new Set(rows.map((row) => row.DATE_NAME));
  const [period] = periods;
  if (period === undefined || periods.size > 1) {
    throw new Error(`the Nomis response covers ${periods.size} periods; one was expected`);
  }
  const published = rows.filter((row) => row.OBS_STATUS === PUBLISHED && row.OBS_VALUE !== '');
  return {
    level: 'regional-occupation',
    period,
    source: NOMIS_EMPLOYMENT.id,
    population: 'People aged 16 and over in employment, by the occupation of their main job',
    counts: 'people',
    byCode: figuresByCode(
      published.map((row) => [
        row.SOC2020_FULL_NAME.slice(0, 4),
        z.coerce.number().int().nonnegative().parse(row.OBS_VALUE),
      ]),
    ),
  };
}
