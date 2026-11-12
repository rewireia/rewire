import { z } from 'zod';

import { timeShareSchema } from './exposure.ts';
import { unitGroupCodeSchema } from './occupation.ts';
import { regionSchema } from './region.ts';

/** The occupation a learner confirmed, as their region names it. */
export const chosenOccupationSchema = z.object({
  /** Code in the classification of the region. */
  code: z.string().min(1).max(40),
  /** The job title the learner recognised as theirs. */
  title: z.string().min(1).max(200),
  /** The international group the occupation is read through. */
  isco08: unitGroupCodeSchema,
});

export type ChosenOccupation = z.infer<typeof chosenOccupationSchema>;

/**
 * What Rewire keeps about a learner: the region, the occupation they confirmed and the
 * time they give to each task. Never the free text they typed.
 */
export const learnerProfileSchema = z.object({
  region: regionSchema,
  occupation: chosenOccupationSchema,
  timeByTask: z.record(z.string(), timeShareSchema),
});

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;

/** Who the server takes the browser for. A visitor becomes a learner on their first save. */
export const sessionSchema = z.object({
  signedIn: z.boolean(),
  /** Explicit demo login, separate from an anonymous saved occupation. */
  authenticated: z.boolean().default(false),
  accessRole: z.enum(['learner', 'business']).nullable().default(null),
  profile: learnerProfileSchema.nullable(),
  /** The name the learner asked to see on their certificates. */
  certificateName: z.string().nullable(),
});

export type Session = z.infer<typeof sessionSchema>;
