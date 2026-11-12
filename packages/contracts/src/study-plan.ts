import { z } from 'zod';

import { enrolmentStatusSchema, pathwayQuerySchema, pathwayStageSchema } from './catalogue.ts';
import { moneySchema, regionSchema } from './region.ts';

const courseIdSchema = z.string().min(1).max(80);

/** More courses than any catalogue of Rewire holds. */
const MAXIMUM_COURSES = 100;

const FIRST_PLAN_DAY = '2020-01-01';
const LAST_PLAN_DAY = '2100-12-31';

/** A day a plan may name. The bounds keep every date worked out from it a real one. */
const planDaySchema = z.iso.date().refine((day) => day >= FIRST_PLAN_DAY && day <= LAST_PLAN_DAY, {
  message: `Expected a day from ${FIRST_PLAN_DAY} to ${LAST_PLAN_DAY}.`,
});

/**
 * How a learner wants to study. Rewire turns it into dates; nothing in it is a fact about
 * a course.
 */
export const studyPlanSchema = z.object({
  /** The day the learner starts. */
  startsOn: planDaySchema,
  /** Hours a week they give to learning. */
  hoursPerWeek: z.number().int().min(1).max(40),
  /** Courses the learner left out of the plan, each named once. */
  leftOut: z
    .array(courseIdSchema)
    .max(MAXIMUM_COURSES)
    .refine((courseIds) => new Set(courseIds).size === courseIds.length, {
      message: 'Expected each course once.',
    }),
  /** For each course the learner moved by hand, the day before which it must not start. */
  notBefore: z.record(courseIdSchema, planDaySchema),
  /** Days the learner books for a course whose provider publishes no length. */
  bookedDays: z.record(courseIdSchema, z.number().int().min(1).max(180)),
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;

/** The days a course takes in the plan, first and last included. */
export const bookingSchema = z.object({
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  /** Whether the learner chose the day it may start. */
  moved: z.boolean(),
  /**
   * Whether its payment holds the course back: unpaid, it waits for today; paid late, it
   * starts the day it was paid for. The courses after it follow.
   */
  heldByPayment: z.boolean(),
});

export type Booking = z.infer<typeof bookingSchema>;

/** What every course of the plan has, whoever runs it. */
const plannedCourseFields = {
  id: z.string(),
  title: z.string(),
  stage: pathwayStageSchema,
  /** Hours the course takes, or `null` when its provider publishes none. */
  hours: z.number().nullable(),
  /** When the learner takes it, or `null` when they left it out. */
  booking: bookingSchema.nullable(),
  /**
   * Whether the learner added it from the catalogue: it is taken out of the plan by removing
   * it from their roadmap, not by leaving it out. Absent for the courses of the plan itself.
   */
  addedByLearner: z.boolean().optional(),
};

/**
 * A course of the learning plan, placed in time. Both kinds have the same fields, so they
 * read as rows of one table; what Rewire cannot know about a free course is fixed.
 */
export const plannedCourseSchema = z.discriminatedUnion('kind', [
  z.object({
    ...plannedCourseFields,
    /** Run by someone else: Rewire links to its page and cannot see into it. */
    kind: z.literal('free'),
    url: z.url(),
    progress: z.literal(0),
    enrolment: z.null(),
    price: z.null(),
    payment: z.null(),
    paidOn: z.null(),
  }),
  z.object({
    ...plannedCourseFields,
    /** Of the demonstration catalogue: it opens in Rewire. */
    kind: z.literal('paid'),
    url: z.null(),
    /** Share of the course done, from 0 to 1: its lessons and its quiz, each one step. */
    progress: z.number().min(0).max(1),
    enrolment: enrolmentStatusSchema,
    price: moneySchema,
    /**
     * Where its payment stands: not made, held by PayPal for review, waiting for the
     * employer to pay the invoice, made, or sent back.
     */
    payment: z.enum(['due', 'held-by-paypal', 'invoice-sent', 'paid', 'refunded']),
    /** The day it was paid for, or `null` while it is not. */
    paidOn: z.iso.date().nullable(),
  }),
]);

export type PlannedCourse = z.infer<typeof plannedCourseSchema>;

export const timelineStageSchema = z.object({
  stage: pathwayStageSchema,
  courses: z.array(plannedCourseSchema),
});

export type TimelineStage = z.infer<typeof timelineStageSchema>;

/** The learning plan of an occupation laid out in time, at the learner's own pace. */
export const studyTimelineSchema = z.object({
  region: regionSchema,
  isco08: z.string(),
  plan: studyPlanSchema,
  /** Whether the plan is the learner's own or the one everyone starts with. */
  saved: z.boolean(),
  stages: z.array(timelineStageSchema),
  /** The day the last course ends, or `null` when every course is left out. */
  finishesOn: z.iso.date().nullable(),
  /** Hours of the courses in the plan whose length is published. */
  knownHours: z.number(),
  /** Days booked for a course of unpublished length until the learner says otherwise. */
  defaultBookedDays: z.number().int(),
});

export type StudyTimeline = z.infer<typeof studyTimelineSchema>;

/** The occupation a plan is read for, and the day it is where the reader is. */
export const studyPlanQuerySchema = pathwayQuerySchema.extend({
  /**
   * The reader's own day, which the plan everyone starts with begins on. The server keeps
   * its own day when this one is missing or further from it than time zones reach.
   */
  today: z.iso.date().optional(),
});
