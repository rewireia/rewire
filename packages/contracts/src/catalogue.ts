import { z } from 'zod';

import { exposureTaskSchema } from './exposure.ts';
import { moneySchema, regionSchema } from './region.ts';

/** The three steps of a learning plan, in the order a person takes them. */
export const pathwayStageSchema = z.enum(['understand', 'apply', 'strengthen']);

export type PathwayStage = z.infer<typeof pathwayStageSchema>;

/** Where a learner stands with a course. */
export const enrolmentStatusSchema = z.enum(['none', 'payment-pending', 'active', 'completed']);

export type EnrolmentStatus = z.infer<typeof enrolmentStatusSchema>;

/** A free course run by someone else: Rewire only links to it. */
export const freeCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  provider: z.string(),
  url: z.url(),
  summary: z.string(),
  languages: z.array(z.string()),
  hours: z.number().nullable(),
  /** Day the link and the "free" claim were last checked. */
  checkedOn: z.string(),
});

export type FreeCourse = z.infer<typeof freeCourseSchema>;

/** A pay-later product PayPal documents for the buyer's country and this amount. */
export const payLaterHintSchema = z.object({ country: z.string(), product: z.string() });

/** A paid course of the demonstration catalogue, priced for a region. */
export const courseCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  stage: pathwayStageSchema,
  level: z.enum(['introductory', 'intermediate']),
  hours: z.number(),
  outcomes: z.array(z.string()),
  lessons: z.number().int(),
  price: moneySchema,
  /** Pay-later products documented for this price in the region; PayPal has the last word. */
  payLater: z.array(payLaterHintSchema),
  /** Always true: every paid course of this catalogue is a demonstration. */
  demo: z.literal(true),
  enrolment: enrolmentStatusSchema,
});

export type CourseCard = z.infer<typeof courseCardSchema>;

export const pathwayStepSchema = z.object({
  stage: pathwayStageSchema,
  /** Free courses come first. */
  freeCourses: z.array(freeCourseSchema),
  courses: z.array(courseCardSchema),
});

export type PathwayStep = z.infer<typeof pathwayStepSchema>;

/** The learning plan for one occupation in one region. */
export const pathwaySchema = z.object({
  region: regionSchema,
  isco08: z.string(),
  occupationTitle: z.string(),
  /** The tasks the plan is about: where to put AI to work, and what stays the person's. */
  focus: z.object({
    mostExposed: z.array(exposureTaskSchema),
    leastExposed: z.array(exposureTaskSchema),
  }),
  steps: z.array(pathwayStepSchema),
});

export type Pathway = z.infer<typeof pathwaySchema>;

export const pathwayQuerySchema = z.object({ isco08: z.string().regex(/^\d{4}$/) });
