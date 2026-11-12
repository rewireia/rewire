import { z } from 'zod';

/** An ISCO-08 unit group code: four digits. */
export const unitGroupCodeSchema = z.string().regex(/^\d{4}$/);

/** Why an occupation is linked to an international unit group. */
export const linkBasisSchema = z.enum([
  'job-title',
  'classification',
  'exact-match',
  'close-match',
  'narrow-match',
  'broad-match',
  'title-majority',
]);

export type LinkBasis = z.infer<typeof linkBasisSchema>;

/** A unit group an occupation can be read through. */
export const unitGroupLinkSchema = z.object({
  isco08: unitGroupCodeSchema,
  /** Title of the unit group; `null` for the few groups the ILO index leaves out. */
  title: z.string().nullable(),
  basis: linkBasisSchema,
  /** Whether the ILO has scored the tasks of this unit group. */
  scored: z.boolean(),
});

export type UnitGroupLink = z.infer<typeof unitGroupLinkSchema>;

export const occupationMatchSchema = z.object({
  occupation: z.object({
    /** Code in the classification of the region. */
    code: z.string(),
    title: z.string(),
    description: z.string().nullable(),
  }),
  /** The title that matched what the person wrote. */
  matchedTitle: z.object({
    text: z.string(),
    language: z.string(),
    qualifier: z.string().nullable(),
    official: z.boolean(),
  }),
  score: z.number().min(0).max(1),
  strength: z.enum(['exact', 'strong', 'partial']),
  /** The unit group proposed; `null` when the occupation has no international bridge. */
  unitGroup: unitGroupLinkSchema.nullable(),
  /** Other unit groups the same occupation is linked to, strongest first. */
  alternatives: z.array(unitGroupLinkSchema),
});

export type OccupationMatch = z.infer<typeof occupationMatchSchema>;

/**
 * One occupation and the international groups it can be read through, without a search:
 * what the confirmation step needs when a page is opened again.
 */
export const occupationDetailSchema = occupationMatchSchema.pick({
  occupation: true,
  unitGroup: true,
  alternatives: true,
});

export type OccupationDetail = z.infer<typeof occupationDetailSchema>;

export const occupationDetailQuerySchema = z.object({
  /** The group the person arrived with, when the title they chose carries its own. */
  isco08: unitGroupCodeSchema.optional(),
});

export const occupationSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  /** Language of the interface, used to order equal matches. */
  lang: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
});

export type OccupationSearchQuery = z.infer<typeof occupationSearchQuerySchema>;

export const occupationSearchResultSchema = z.object({
  query: z.string(),
  matches: z.array(occupationMatchSchema),
});

export type OccupationSearchResult = z.infer<typeof occupationSearchResultSchema>;
