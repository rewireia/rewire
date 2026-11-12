import { z } from 'zod';

import { iscoUnitGroupCodeSchema } from './isco.ts';

/** A score between 0 (generative AI cannot do the task) and 1 (it could do all of it). */
const scoreSchema = z.number().min(0).max(1);

/**
 * The occupation-level category the ILO publishes, from the mean and the spread of the
 * task scores (ILO Working Paper 140, table 5). Copied from the source, never recomputed.
 */
export const exposureGradientSchema = z.enum([
  'gradient-4',
  'gradient-3',
  'gradient-2',
  'gradient-1',
  'minimal',
  'not-exposed',
]);

export type ExposureGradient = z.infer<typeof exposureGradientSchema>;

export const scoredTaskSchema = z.object({
  /** Unit group and position of the task within it, such as `2512-3`. */
  id: z.string().regex(/^\d{4}-\d+$/),
  text: z.string().min(1),
  score: scoreSchema,
  /**
   * The two model predictions behind the score. Their distance shows how much the models
   * disagreed; it is not a confidence interval.
   */
  modelScores: z.object({ gpt4o: scoreSchema.nullable(), gemini: scoreSchema.nullable() }),
  /** `reconciled` scores were set by the authors after expert review. */
  origin: z.enum(['predicted', 'reconciled']),
});

export type ScoredTask = z.infer<typeof scoredTaskSchema>;

export const scoredOccupationSchema = z.object({
  isco08: iscoUnitGroupCodeSchema,
  title: z.string().min(1),
  /** First digit of the code: the ISCO-08 major group. */
  majorGroup: z.string().regex(/^\d$/),
  meanScore: scoreSchema,
  standardDeviation: z.number().min(0),
  gradient: exposureGradientSchema,
  tasks: z.array(scoredTaskSchema).min(1),
});

export type ScoredOccupation = z.infer<typeof scoredOccupationSchema>;

/** Every unit group names a major group, and the dataset gives the title of each. */
export const exposureDatasetSchema = z
  .object({
    majorGroups: z.array(z.object({ code: z.string().regex(/^\d$/), title: z.string().min(1) })),
    occupations: z.array(scoredOccupationSchema),
  })
  .superRefine((dataset, context) => {
    const named = new Set(dataset.majorGroups.map((group) => group.code));
    dataset.occupations.forEach((occupation, position) => {
      if (!named.has(occupation.majorGroup)) {
        context.addIssue({
          code: 'custom',
          path: ['occupations', position, 'majorGroup'],
          message: `Major group ${occupation.majorGroup} of unit group ${occupation.isco08} has no title in majorGroups.`,
        });
      }
    });
  });

export type ExposureDataset = z.infer<typeof exposureDatasetSchema>;

/** The written reasoning each model gave for a task score, keyed by task id. */
export const taskRationalesSchema = z.record(
  z.string(),
  z.object({ gpt4o: z.string().nullable(), gemini: z.string().nullable() }),
);

export type TaskRationales = z.infer<typeof taskRationalesSchema>;
