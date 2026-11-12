import { z } from 'zod';

import { iscoUnitGroupCodeSchema } from './isco.ts';

export const regionSchema = z.enum(['eu', 'us', 'uk']);

export type Region = z.infer<typeof regionSchema>;

/**
 * Why an occupation is linked to an ISCO-08 unit group.
 *
 * - `classification`: the regional code is built on the ISCO-08 code (ESCO).
 * - `exact-match` … `broad-match`: relation stated by an official crosswalk (O*NET).
 * - `title-majority`: the unit group most of the occupation's job titles are coded to (UK).
 */
export const iscoLinkBasisSchema = z.enum([
  'classification',
  'exact-match',
  'close-match',
  'narrow-match',
  'broad-match',
  'title-majority',
]);

export type IscoLinkBasis = z.infer<typeof iscoLinkBasisSchema>;

export const iscoLinkSchema = z.object({
  isco08: iscoUnitGroupCodeSchema,
  basis: iscoLinkBasisSchema,
  /** How many source records back the link: crosswalk rows or coded job titles. */
  support: z.number().int().positive(),
});

export type IscoLink = z.infer<typeof iscoLinkSchema>;

export const jobTitleSchema = z.object({
  text: z.string().min(1),
  /** Two-letter language of the title. */
  language: z.string().regex(/^[a-z]{2}$/),
  /** Industry or context that narrows the title, when the source gives one. */
  qualifier: z.string().min(1).optional(),
  /** Set when the source codes this title on its own, which then wins over the occupation. */
  isco08: iscoUnitGroupCodeSchema.optional(),
});

export type JobTitle = z.infer<typeof jobTitleSchema>;

export const regionalOccupationSchema = z.object({
  /** Code in the regional scheme: ESCO code, O*NET-SOC code or SOC 2020 unit group. */
  code: z.string().min(1),
  /** Official English title. */
  title: z.string().min(1),
  description: z.string().optional(),
  /** Ordered: the first link is the one the product proposes. Empty when no bridge exists. */
  iscoLinks: z.array(iscoLinkSchema),
  /** Every other way people name the job: alternative, reported and translated titles. */
  titles: z.array(jobTitleSchema),
});

export type RegionalOccupation = z.infer<typeof regionalOccupationSchema>;

/**
 * One region's occupations in a common shape, so the engine treats ESCO, O*NET and
 * SOC 2020 alike.
 */
export const regionalClassificationSchema = z.object({
  region: regionSchema,
  scheme: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    publisher: z.string().min(1),
  }),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1),
  occupations: z.array(regionalOccupationSchema).min(1),
});

export type RegionalClassification = z.infer<typeof regionalClassificationSchema>;
