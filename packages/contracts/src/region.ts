import { z } from 'zod';

/** The three regions Rewire serves. */
export const regionSchema = z.enum(['eu', 'us', 'uk']);

export type Region = z.infer<typeof regionSchema>;

/** A public page that backs a statement. */
export const sourceLinkSchema = z.object({ title: z.string(), url: z.url() });

export type SourceLink = z.infer<typeof sourceLinkSchema>;

export const currencySchema = z.enum(['USD', 'GBP', 'EUR']);

export type Currency = z.infer<typeof currencySchema>;

/** An amount in the smallest unit of its currency: cents or pence. */
export const moneySchema = z.object({
  currency: currencySchema,
  minorUnits: z.number().int().nonnegative(),
});

export type Money = z.infer<typeof moneySchema>;

/** What a person sees about a region before choosing it, and what changes with it. */
export const regionSummarySchema = z.object({
  region: regionSchema,
  name: z.string(),
  currency: currencySchema,
  locale: z.string(),
  classification: z.object({
    name: z.string(),
    version: z.string(),
    publisher: z.string(),
    summary: z.string(),
    occupations: z.number().int(),
    jobTitles: z.number().int(),
    /** Languages a job title can be written in. */
    languages: z.array(z.string()),
    /** Share of the job titles, from 0 to 1, that reach an occupation the ILO has scored. */
    scoredTitleShare: z.number().min(0).max(1),
  }),
  aiSkillsFramework: sourceLinkSchema.extend({ publisher: z.string() }),
  employerCase: z.object({
    headline: z.string(),
    quote: z.string(),
    explanation: z.string(),
    source: sourceLinkSchema,
  }),
});

export type RegionSummary = z.infer<typeof regionSummarySchema>;

export const regionListSchema = z.object({ regions: z.array(regionSummarySchema) });

export type RegionList = z.infer<typeof regionListSchema>;
