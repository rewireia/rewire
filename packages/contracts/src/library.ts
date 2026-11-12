import { z } from 'zod';

/** How long and how deep a reading is: a short note, a practical guide or a full report. */
export const readingTypeSchema = z.enum(['note', 'guide', 'report']);

export type ReadingType = z.infer<typeof readingTypeSchema>;

export const readingLevelSchema = z.enum(['introductory', 'intermediate', 'advanced']);

export type ReadingLevel = z.infer<typeof readingLevelSchema>;

/** What a reading is about. */
export const readingTopicSchema = z.enum([
  'jobs',
  'learning',
  'rights',
  'fairness',
  'wellbeing',
  'policy',
]);

export type ReadingTopic = z.infer<typeof readingTopicSchema>;

/** Where a reading applies: everywhere, or one of the regions Rewire serves. */
export const readingScopeSchema = z.enum(['global', 'eu', 'us', 'uk']);

export type ReadingScope = z.infer<typeof readingScopeSchema>;

/** A public document about AI and work that Rewire links to and never copies. */
export const readingSchema = z.object({
  id: z.string(),
  type: readingTypeSchema,
  level: readingLevelSchema,
  topic: readingTopicSchema,
  scope: readingScopeSchema,
  /** The title its publisher gives it. */
  title: z.string(),
  /** The organisation that publishes it. */
  source: z.string(),
  year: z.number().int(),
  url: z.url(),
  format: z.enum(['web', 'pdf']),
  /** Two-letter language of the document. */
  language: z.string(),
  /** Reading time estimated from its length, in minutes. */
  minutes: z.number().int().positive(),
  /** Why it may interest the reader, in Rewire's own words and the language asked for. */
  why: z.string(),
  /** Day the link and the title were last read at the publisher. */
  checkedOn: z.iso.date(),
});

export type Reading = z.infer<typeof readingSchema>;

export const libraryQuerySchema = z.object({ language: z.enum(['en', 'es']).default('en') });

export const librarySchema = z.object({ readings: z.array(readingSchema) });

export type Library = z.infer<typeof librarySchema>;
