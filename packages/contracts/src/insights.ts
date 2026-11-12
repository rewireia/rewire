import { z } from 'zod';

import { exposureGradientSchema, taskBandSchema } from './exposure.ts';
import { unitGroupCodeSchema } from './occupation.ts';
import { currencySchema, regionSchema } from './region.ts';

const scoreSchema = z.number().min(0).max(1);
const shareSchema = z.number().min(0).max(1);
const countSchema = z.number().int().nonnegative();

/** The source of an aggregate and the edition and day it was taken from. */
export const insightSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  version: z.string(),
  url: z.url(),
  retrievedOn: z.iso.date(),
});

/**
 * The level the labour figures of a region are published at: the region's own occupations, or
 * the ISCO-08 sub-major (two-digit) or major (one-digit) groups when nothing finer exists.
 */
export const insightLevelSchema = z.enum(['regional-occupation', 'isco-2-digit', 'isco-1-digit']);

const unitGroupLineSchema = z.object({
  isco08: unitGroupCodeSchema,
  title: z.string(),
  meanScore: scoreSchema,
  gradient: exposureGradientSchema,
});

/** What the ILO index says, the same for every region: the occupations and their scores. */
const indexInsightsSchema = z.object({
  source: insightSourceSchema,
  /** Scored ISCO-08 unit groups. */
  unitGroups: countSchema,
  /** Unit groups in each category the ILO gives them, from the most exposed. */
  byGradient: z.array(z.object({ gradient: exposureGradientSchema, unitGroups: countSchema })),
  /** Unit groups whose mean task score falls in each band, from the most exposed. */
  byBand: z.array(z.object({ band: taskBandSchema, unitGroups: countSchema })),
  /** The five highest and the five lowest mean task scores. */
  mostExposed: z.array(unitGroupLineSchema).max(5),
  leastExposed: z.array(unitGroupLineSchema).max(5),
});

/** One ISCO-08 major group: its unit groups' mean score, and how many work in it here. */
const majorGroupInsightSchema = z.object({
  code: z.string().regex(/^\d$/),
  title: z.string(),
  /** Unweighted mean of the mean scores of its unit groups. */
  meanScore: scoreSchema,
  unitGroups: countSchema,
  /** People or jobs of the region counted in the group; `null` when it cannot be told apart. */
  employed: countSchema.nullable(),
  employedShare: shareSchema.nullable(),
});

/** Employment of the region read through the exposure of the occupations it counts. */
const employmentInsightsSchema = z.object({
  source: insightSourceSchema,
  level: insightLevelSchema,
  counts: z.enum(['people', 'jobs']),
  period: z.string(),
  population: z.string(),
  /** Everyone the series counts. */
  total: countSchema,
  /** Those in a group or occupation that reaches a scored unit group: what the shares cover. */
  matched: countSchema,
  /** Mean of the occupations' scores, weighted by how many work in each. */
  meanScore: scoreSchema,
  /** How many work in occupations whose score falls in each band, from the most exposed. */
  byBand: z.array(
    z.object({
      band: taskBandSchema,
      employed: countSchema,
      share: shareSchema,
      groups: countSchema,
    }),
  ),
});

/** One occupation or group of the pay series, with its pay and the score it is read with. */
const payPointSchema = z.object({
  code: z.string(),
  title: z.string(),
  pay: countSchema,
  meanScore: scoreSchema,
});

/** Pay of the region against exposure, as far as the region publishes it. */
const payInsightsSchema = z.object({
  source: insightSourceSchema,
  level: insightLevelSchema,
  currency: currencySchema,
  measure: z.enum(['median-annual', 'mean-monthly']),
  period: z.string(),
  population: z.string(),
  points: z.array(payPointSchema),
  /** The points split at the median pay: the mean score of the better and the worse paid half. */
  split: z.object({
    medianPay: z.number().nonnegative(),
    above: z.object({ groups: countSchema, meanScore: scoreSchema }),
    below: z.object({ groups: countSchema, meanScore: scoreSchema }),
  }),
});

/** The data story of a region. A part the region's sources do not publish is `null`. */
export const regionInsightsSchema = z.object({
  region: regionSchema,
  index: indexInsightsSchema,
  majorGroups: z.array(majorGroupInsightSchema),
  employment: employmentInsightsSchema.nullable(),
  pay: payInsightsSchema.nullable(),
});

export type InsightSource = z.infer<typeof insightSourceSchema>;
export type RegionInsights = z.infer<typeof regionInsightsSchema>;
export type EmploymentInsights = z.infer<typeof employmentInsightsSchema>;
export type PayInsights = z.infer<typeof payInsightsSchema>;
export type MajorGroupInsight = z.infer<typeof majorGroupInsightSchema>;
