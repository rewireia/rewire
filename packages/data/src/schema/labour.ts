import { z } from 'zod';

import { regionSchema } from './classification.ts';

/**
 * What a code of a labour series stands for.
 *
 * - `regional-occupation`: an occupation of the regional classification. For O*NET-SOC, the
 *   SOC occupation its code begins with (`15-1252` for `15-1252.00`).
 * - `isco-2-digit`, `isco-1-digit`: an ISCO-08 sub-major or major group, when the source
 *   publishes nothing finer.
 */
export const labourLevelSchema = z.enum(['regional-occupation', 'isco-2-digit', 'isco-1-digit']);

export type LabourLevel = z.infer<typeof labourLevelSchema>;

/** The shape a code must have at each level, so a series cannot mix levels. */
const CODE_PATTERN_BY_LEVEL = {
  'regional-occupation': /^\S+$/,
  'isco-2-digit': /^\d{2}$/,
  'isco-1-digit': /^\d$/,
} as const satisfies Record<LabourLevel, RegExp>;

const labourSeriesShape = {
  level: labourLevelSchema,
  /** The period the figures describe, as the source names it: `May 2025`, `2025`. */
  period: z.string().min(1),
  /** Id of the source in the manifest, so every figure can be traced back to it. */
  source: z.string().min(1),
  /** Who the figures count, in the words of the source: the population behind them. */
  population: z.string().min(1),
  /** Whole numbers, only for codes with a published value: a missing figure is absent, never 0. */
  byCode: z.record(z.string(), z.number().int().nonnegative()),
  /** Titles of the groups, when the level is an ISCO-08 group the bundle has no title for. */
  titles: z.record(z.string(), z.string().min(1)).optional(),
};

/** Every code in `byCode` and `titles` has the shape its series level requires. */
function codesMatchLevel(
  series: { level: LabourLevel; byCode: object; titles?: object | undefined },
  context: z.RefinementCtx,
): void {
  const pattern = CODE_PATTERN_BY_LEVEL[series.level];
  const codes = [...Object.keys(series.byCode), ...Object.keys(series.titles ?? {})];
  for (const code of codes.filter((candidate) => !pattern.test(candidate))) {
    context.addIssue({ code: 'custom', message: `${code} is not a code of level ${series.level}` });
  }
}

/** Employment in each occupation, counted as people or as jobs. */
export const employmentSeriesSchema = z
  .object({
    ...labourSeriesShape,
    /** `jobs` when a person with two jobs counts twice (surveys of employers), else `people`. */
    counts: z.enum(['people', 'jobs']),
  })
  .superRefine(codesMatchLevel);

export type EmploymentSeries = z.infer<typeof employmentSeriesSchema>;

/** What each occupation earns, gross, in whole units of its currency. */
export const paySeriesSchema = z
  .object({
    ...labourSeriesShape,
    currency: z.enum(['EUR', 'GBP', 'USD']),
    /** The statistic the source publishes; the two are not comparable with each other. */
    measure: z.enum(['median-annual', 'mean-monthly']),
  })
  .superRefine(codesMatchLevel);

export type PaySeries = z.infer<typeof paySeriesSchema>;

/** A series of either kind, for code that reads only what they share. */
export type LabourSeries = EmploymentSeries | PaySeries;

/** The labour market around the occupations of one region. A series no source gives is absent. */
export const labourContextSchema = z.object({
  region: regionSchema,
  employment: employmentSeriesSchema.optional(),
  pay: paySeriesSchema.optional(),
});

export type LabourContext = z.infer<typeof labourContextSchema>;
