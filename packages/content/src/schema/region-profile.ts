import { regionSchema } from '@rewire/data/schema';
import { z } from 'zod';

import { currencySchema, moneySchema } from './money.ts';

/** A public page that backs a statement, so every claim can be checked. */
const sourceSchema = z.object({ title: z.string().min(1), url: z.url() });

/** A PayPal pay-later product offered to buyers of one country. */
export const payLaterOfferSchema = z.object({
  /** ISO 3166-1 alpha-2 country of the buyer. */
  country: z.string().regex(/^[A-Z]{2}$/),
  product: z.string().min(1),
  minimum: moneySchema,
  maximum: moneySchema,
  /** The page the limits were read from. */
  source: sourceSchema,
  /** The day the limits were last read from that page. */
  checkedOn: z.iso.date(),
});

export type PayLaterOffer = z.infer<typeof payLaterOfferSchema>;

/** Everything that changes from one region to another, outside the data bundle. */
export const regionProfileSchema = z.object({
  region: regionSchema,
  name: z.string().min(1),
  currency: currencySchema,
  /** Locale used to format numbers, money and dates for the region. */
  locale: z.string().min(2),
  /** The classification a job title is recognised in. */
  classification: z.object({
    name: z.string().min(1),
    publisher: z.string().min(1),
    summary: z.string().min(1),
  }),
  /** The public framework of AI skills the learning plan follows in the region. */
  aiSkillsFramework: sourceSchema.extend({ publisher: z.string().min(1) }),
  /**
   * Why an employer may pay for the training: the rule or scheme of the region, quoted
   * from its source and never paraphrased into a promise.
   */
  employerCase: z.object({
    headline: z.string().min(1),
    quote: z.string().min(1),
    explanation: z.string().min(1),
    source: sourceSchema,
  }),
  payLater: z.array(payLaterOfferSchema),
});

export type RegionProfile = z.infer<typeof regionProfileSchema>;
