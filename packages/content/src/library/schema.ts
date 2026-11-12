import { z } from 'zod';

/** The order the library shows its kinds in: short notes, then guides, then full reports. */
export const READING_TYPES = ['note', 'guide', 'report'] as const;

/**
 * A public document about AI and work, as Rewire lists it: the publisher's title and link, how
 * long and how deep it is, and why it may interest the reader, written by Rewire in English and
 * in Spanish. The API serves it with `why` in the language asked for.
 */
export const readingContentSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(READING_TYPES),
  level: z.enum(['introductory', 'intermediate', 'advanced']),
  topic: z.enum(['jobs', 'learning', 'rights', 'fairness', 'wellbeing', 'policy']),
  scope: z.enum(['global', 'eu', 'us', 'uk']),
  title: z.string().trim().min(1),
  source: z.string().trim().min(1),
  year: z.number().int().min(1990).max(2100),
  url: z.url({ protocol: /^https$/ }),
  format: z.enum(['web', 'pdf']),
  language: z.string().regex(/^[a-z]{2}$/),
  minutes: z.number().int().positive(),
  why: z.strictObject({ en: z.string().trim().min(1), es: z.string().trim().min(1) }),
  checkedOn: z.iso.date(),
});

export type ReadingContent = z.infer<typeof readingContentSchema>;
