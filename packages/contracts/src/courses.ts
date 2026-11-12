import { z } from 'zod';

import { enrolmentStatusSchema } from './catalogue.ts';
import { catalogueOfferSchema } from './offers.ts';
import { moneySchema, regionSchema } from './region.ts';

/** Who runs a course of the catalogue: Rewire hosts it, or lists it from its provider. */
export const courseKindSchema = z.enum(['hosted', 'listed']);

export type CourseKind = z.infer<typeof courseKindSchema>;

export const courseLevelSchema = z.enum(['introductory', 'intermediate', 'advanced']);

export type CourseLevel = z.infer<typeof courseLevelSchema>;

/** What the provider asks for the course on its own site, as last checked. */
export const providerAccessSchema = z.enum(['free', 'paid', 'unknown']);

export type ProviderAccess = z.infer<typeof providerAccessSchema>;

/** A subject of the catalogue, named in the language the catalogue was asked in. */
export const courseTopicSchema = z.object({ id: z.string(), label: z.string() });

export type CourseTopic = z.infer<typeof courseTopicSchema>;

/** One course of the marketplace, as a card shows it. */
export const catalogueCourseSchema = z.object({
  id: z.string(),
  kind: courseKindSchema,
  /** The title its provider gives it. */
  title: z.string(),
  provider: z.string(),
  /** The course on its provider's site; null for the courses Rewire hosts. */
  url: z.url().nullable(),
  summary: z.string(),
  /** Ids of the subjects it belongs to, from the `topics` of the catalogue. */
  topics: z.array(z.string()),
  level: courseLevelSchema,
  /** Hours its provider states, when it states them. */
  hours: z.number().positive().nullable(),
  /** Two-letter languages the course is offered in. */
  languages: z.array(z.string()),
  providerAccess: providerAccessSchema,
  /** The sandbox price of this marketplace, always set by the server. */
  price: moneySchema,
  /** The discount in that price while a beacon of the seller runs. */
  offer: catalogueOfferSchema.nullable().optional(),
  /** Day the course and its link were last read at the provider. */
  checkedOn: z.iso.date(),
  enrolment: enrolmentStatusSchema,
});

export type CatalogueCourse = z.infer<typeof catalogueCourseSchema>;

/** A catalogue a provider publishes, which listed courses were read from. */
export const catalogueSourceSchema = z.object({
  provider: z.string(),
  /** The public address it was read from; null for an official export file. */
  source: z.url().nullable(),
  /** How the source asks to be cited, with the day of the data. */
  citation: z.string(),
  capturedOn: z.iso.date(),
});

export type CatalogueSource = z.infer<typeof catalogueSourceSchema>;

/**
 * Every published course of a region, with the subjects and providers to filter them by and the
 * catalogues the listed ones come from. Courses offered in the language asked for come first.
 */
export const courseCatalogueSchema = z.object({
  region: regionSchema,
  courses: z.array(catalogueCourseSchema),
  topics: z.array(courseTopicSchema),
  providers: z.array(z.string()),
  sources: z.array(catalogueSourceSchema),
});

export type CourseCatalogue = z.infer<typeof courseCatalogueSchema>;

export const courseCatalogueQuerySchema = z.object({
  language: z.enum(['en', 'es']).default('en'),
});

/** What a person tells the course guide, in their own words. It is answered and not kept. */
export const catalogueSearchRequestSchema = z.object({
  region: regionSchema,
  language: z.enum(['en', 'es']),
  query: z.string().trim().min(3).max(400),
  /** Courses already proposed, so that asking again brings others. */
  exclude: z.array(z.string().max(120)).max(30).default([]),
});

export type CatalogueSearchRequest = z.infer<typeof catalogueSearchRequestSchema>;

/**
 * The courses proposed for a request, best first. The server finds the candidates in its own
 * catalogue; a model may only choose among them and say why, in words and without figures.
 */
export const catalogueSearchResultSchema = z.object({
  engine: z.enum(['ai', 'rules']),
  matches: z.array(z.object({ courseId: z.string(), reason: z.string().nullable() })).max(6),
});

export type CatalogueSearchResult = z.infer<typeof catalogueSearchResultSchema>;

/**
 * A listed course the learner bought in the sandbox. It is taken at its provider: Rewire has no
 * lessons, quiz or certificate for it.
 */
export const listedEnrolmentSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  provider: z.string(),
  url: z.url(),
  hours: z.number().positive().nullable(),
  status: z.enum(['active', 'completed']),
  startedAt: z.string(),
});

export type ListedEnrolment = z.infer<typeof listedEnrolmentSchema>;

/** Where the listed courses of the marketplace come from, for the page of sources. */
export const courseSourceListSchema = z.object({
  sources: z.array(
    z.object({
      /** A provider's public catalogue API, courses checked one by one, or an official export. */
      kind: z.enum(['catalogue-api', 'hand-checked', 'official-export']),
      /** The provider, for a catalogue of one provider; null for courses of several. */
      provider: z.string().nullable(),
      source: z.url().nullable(),
      /** How the source asks to be cited; null for courses checked by hand. */
      citation: z.string().nullable(),
      /** Day of the data: captured, exported or, for courses checked by hand, the latest check. */
      capturedOn: z.iso.date(),
      courses: z.number().int().nonnegative(),
      providers: z.number().int().positive(),
    }),
  ),
});

export type CourseSourceList = z.infer<typeof courseSourceListSchema>;
