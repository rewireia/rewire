import { z } from 'zod';

import { courseCardSchema } from './catalogue.ts';
import { startedOrderSchema } from './checkout.ts';
import { exposureReportSchema, timeShareSchema } from './exposure.ts';
import { occupationMatchSchema, unitGroupCodeSchema } from './occupation.ts';
import { regionSchema } from './region.ts';

/** Languages the guide answers in. */
export const guideLanguageSchema = z.enum(['en', 'es']);

export type GuideLanguage = z.infer<typeof guideLanguageSchema>;

/**
 * Whether this server has an AI model to talk to, and what becomes of the words a person
 * gives it. Without a model, the product still works.
 */
export const guideStatusSchema = z.object({
  available: z.boolean(),
  /** The company whose model answers, or `null` when the server does not say. */
  provider: z.literal('openai').nullable().default(null),
  /**
   * Whether that company may use what the person writes to improve its models. The guide
   * says so before the person writes anything.
   */
  usedToImproveModels: z.boolean().default(false),
});

export type GuideStatus = z.infer<typeof guideStatusSchema>;

/** A person describes their job in their own words, in any length. */
export const interpretRequestSchema = z.object({
  text: z.string().trim().min(2).max(600),
  lang: guideLanguageSchema.default('en'),
});

export type InterpretRequest = z.infer<typeof interpretRequestSchema>;

/**
 * The occupations the description may be about. Every one of them comes from the official
 * classification: the model chooses among what the engine found, and cannot add any.
 */
export const interpretResultSchema = z.object({
  matches: z.array(occupationMatchSchema),
  /** A sentence from the guide about its choice or about what it still needs to know. */
  note: z.string().nullable(),
  /** `ai` when the model chose; `search` when only the plain search ran. */
  source: z.enum(['ai', 'search']),
});

export type InterpretResult = z.infer<typeof interpretResultSchema>;

export const explanationRequestSchema = z.object({
  region: regionSchema,
  timeByTask: z.record(z.string(), timeShareSchema).default({}),
  lang: guideLanguageSchema.default('en'),
});

export type ExplanationRequest = z.infer<typeof explanationRequestSchema>;

/**
 * The report in plain words. Its text holds no figure: a task is named by its tag, such as `[T2]`,
 * and the page draws the score of that task from the report beside it.
 */
export const explanationSchema = z.object({ paragraphs: z.array(z.string()).min(1) });

export type Explanation = z.infer<typeof explanationSchema>;

export const guideMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(4000),
});

export type GuideMessage = z.infer<typeof guideMessageSchema>;

export const guideRequestSchema = z.object({
  /** The conversation so far, oldest first, ending with what the person just wrote. */
  messages: z.array(guideMessageSchema).min(1).max(30),
  region: regionSchema,
  /** The occupation the person is looking at, if any. */
  isco08: unitGroupCodeSchema.optional(),
  lang: guideLanguageSchema.default('en'),
});

export type GuideRequest = z.infer<typeof guideRequestSchema>;

/**
 * Something the guide found or prepared, for the page to show next to its words. The guide's words
 * hold no figure: every number the person reads in a conversation is in a card, from the server.
 */
export const guideCardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('occupations'), matches: z.array(occupationMatchSchema) }),
  /** The report the guide read, with its headline figures from the ILO index. */
  z.object({
    type: z.literal('report'),
    isco08: unitGroupCodeSchema,
    title: z.string(),
    ...exposureReportSchema.pick({ meanScore: true, gradient: true, standing: true }).shape,
  }),
  z.object({ type: z.literal('courses'), courses: z.array(courseCardSchema) }),
  /** The person's plan in time, as the guide read it or as it has just changed it. */
  z.object({
    type: z.literal('plan'),
    isco08: unitGroupCodeSchema,
    hoursPerWeek: z.number().int(),
    /** The day the plan starts. */
    startsOn: z.iso.date(),
    /** The day the plan ends, or `null` when it holds no course. */
    finishesOn: z.iso.date().nullable(),
    /** Whether the guide changed the plan in this answer. */
    changed: z.boolean(),
  }),
  /**
   * An order the guide opened at PayPal. Nothing is charged until the person approves it
   * in PayPal: the guide prepares purchases and never completes them.
   */
  z.object({
    type: z.literal('checkout'),
    order: startedOrderSchema,
    courseId: z.string(),
    courseTitle: z.string(),
  }),
]);

export type GuideCard = z.infer<typeof guideCardSchema>;

export const guideReplySchema = z.object({ text: z.string(), cards: z.array(guideCardSchema) });

export type GuideReply = z.infer<typeof guideReplySchema>;
