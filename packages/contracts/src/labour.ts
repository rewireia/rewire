import { z } from 'zod';

import { unitGroupCodeSchema } from './occupation.ts';
import { currencySchema } from './region.ts';

/** One published figure, with what is needed to say honestly what it describes. */
const labourFigureSchema = z.object({
  value: z.number().int().nonnegative(),
  /**
   * What the figure is about: the occupation itself, or the wider international group
   * around it when the source publishes nothing finer.
   */
  level: z.enum(['regional-occupation', 'isco-2-digit', 'isco-1-digit']),
  /** The period the figure describes, as its source names it. */
  period: z.string(),
  /** Who the figure counts, in the words of its source. */
  population: z.string(),
  groupCode: z.string(),
  groupTitle: z.string().nullable(),
  source: z.object({ id: z.string(), title: z.string(), publisher: z.string(), url: z.url() }),
});

export const employmentFigureSchema = labourFigureSchema.extend({
  /** `jobs` when a person with two jobs counts twice, as in surveys of employers. */
  counts: z.enum(['people', 'jobs']),
});

export type EmploymentFigure = z.infer<typeof employmentFigureSchema>;

export const payFigureSchema = labourFigureSchema.extend({
  currency: currencySchema,
  /** The statistic the source publishes. The two are not comparable with each other. */
  measure: z.enum(['median-annual', 'mean-monthly']),
});

export type PayFigure = z.infer<typeof payFigureSchema>;

/** The labour market around one occupation. A figure no source publishes is `null`. */
export const occupationLabourSchema = z.object({
  employment: employmentFigureSchema.nullable(),
  pay: payFigureSchema.nullable(),
});

export type OccupationLabour = z.infer<typeof occupationLabourSchema>;

/**
 * The occupation to look up: by its code in the classification of the region, by its
 * international group, or by both. A group alone finds only the figures published by group.
 */
export const occupationLabourQuerySchema = z
  .object({
    code: z.string().min(1).max(40).optional(),
    isco08: unitGroupCodeSchema.optional(),
  })
  .refine((query) => query.code !== undefined || query.isco08 !== undefined, {
    message: 'give the code of the occupation, its international group, or both',
  });
