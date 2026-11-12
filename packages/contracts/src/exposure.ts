import { z } from 'zod';

import { unitGroupCodeSchema } from './occupation.ts';

/** Band of a task score, as the ILO defines it. */
export const taskBandSchema = z.enum(['high', 'medium', 'low', 'very-low']);

export type TaskBand = z.infer<typeof taskBandSchema>;

/** Category of a unit group, as the ILO publishes it. */
export const exposureGradientSchema = z.enum([
  'gradient-4',
  'gradient-3',
  'gradient-2',
  'gradient-1',
  'minimal',
  'not-exposed',
]);

export type ExposureGradient = z.infer<typeof exposureGradientSchema>;

const scoreSchema = z.number().min(0).max(1);
const scoreRangeSchema = z.object({ low: scoreSchema, high: scoreSchema });
/** How many tasks fall in each band. */
const taskCountsByBandSchema = z.object({
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  'very-low': z.number().int().nonnegative(),
});
/** Points out of 100 of the working week in each band, in steps of 5. */
const weekPointsByBandSchema = z.object({
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  'very-low': z.number().int().nonnegative(),
});

export const exposureTaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  score: scoreSchema,
  band: taskBandSchema,
  /**
   * The lowest and the highest of the two model predictions and the published score; it shows
   * how much the models disagreed and is not a confidence interval.
   */
  range: scoreRangeSchema,
  reviewedByExperts: z.boolean(),
});

export type ExposureTask = z.infer<typeof exposureTaskSchema>;

/** How much of the working week a person gives to a task. */
export const timeShareSchema = z.enum(['most', 'some', 'little', 'none']);

export type TimeShare = z.infer<typeof timeShareSchema>;

/** The exposure of a person's own version of the job: the tasks they really do. */
export const personalExposureSchema = z.object({
  /** Time-weighted mean of the task scores; `null` when no task takes any time. */
  score: scoreSchema.nullable(),
  range: scoreRangeSchema.nullable(),
  /** Points out of 100 of the week spent on tasks of each band. */
  weekByBand: weekPointsByBandSchema,
  tasksCounted: z.number().int(),
});

export type PersonalExposure = z.infer<typeof personalExposureSchema>;

export const unitGroupSummarySchema = z.object({
  isco08: unitGroupCodeSchema,
  title: z.string(),
  majorGroup: z.object({ code: z.string(), title: z.string() }),
  meanScore: scoreSchema,
  gradient: exposureGradientSchema,
  tasks: z.number().int(),
});

export type UnitGroupSummary = z.infer<typeof unitGroupSummarySchema>;

export const unitGroupListSchema = z.object({ unitGroups: z.array(unitGroupSummarySchema) });

export type UnitGroupList = z.infer<typeof unitGroupListSchema>;

/** Everything the ILO index says about one unit group. */
export const exposureReportSchema = unitGroupSummarySchema.omit({ tasks: true }).extend({
  standardDeviation: z.number().min(0),
  /** Most exposed task first. */
  tasks: z.array(exposureTaskSchema),
  tasksByBand: taskCountsByBandSchema,
  standing: z.object({
    /** Scored unit groups with a higher mean score. */
    moreExposed: z.number().int(),
    outOf: z.number().int(),
  }),
  /** The exposure when every task takes the same time. */
  personal: personalExposureSchema,
});

export type ExposureReport = z.infer<typeof exposureReportSchema>;

export const personalExposureRequestSchema = z.object({
  /** Task id → time the person gives it. Tasks left out count as `some`. */
  timeByTask: z.record(z.string(), timeShareSchema),
});

export type PersonalExposureRequest = z.infer<typeof personalExposureRequestSchema>;

/** The written reasoning the authors' models gave for a task score. */
export const taskRationaleSchema = z.object({
  taskId: z.string(),
  rationales: z.array(z.object({ model: z.string(), text: z.string() })),
});

export type TaskRationale = z.infer<typeof taskRationaleSchema>;

/** AI translations of official task text; the source report remains in English. */
export const taskTranslationsSchema = z.object({
  language: z.literal('es'),
  translations: z.array(z.object({ id: z.string(), text: z.string() })),
});
export type TaskTranslations = z.infer<typeof taskTranslationsSchema>;
