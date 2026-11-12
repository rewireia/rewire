import { z } from 'zod';

import { courseLevelSchema } from './courses.ts';
import { moneySchema, regionSchema } from './region.ts';

const httpsUrlSchema = z.url().regex(/^https:\/\//, 'expected an https address');

/**
 * A course the seller publishes from its dashboard. The description is public; the access
 * address is where the course is taken, and only a learner who has paid for it is shown it.
 */
export const sellerCourseInputSchema = z.object({
  region: regionSchema,
  title: z.string().trim().min(8).max(120),
  summary: z.string().trim().min(40).max(600),
  level: courseLevelSchema,
  hours: z.number().positive().max(400),
  /** Two-letter language the course is taught in. */
  language: z.enum(['en', 'es']),
  /** Ids of one to three subjects of the catalogue. */
  topics: z.array(z.string().min(1).max(60)).min(1).max(3),
  accessUrl: httpsUrlSchema,
  /** Price in the smallest unit of the region's currency. */
  priceMinor: z.number().int().min(100).max(100_000),
  published: z.boolean(),
});

export type SellerCourseInput = z.infer<typeof sellerCourseInputSchema>;

/** A course the seller created, as its dashboard lists it. */
export const sellerCourseSchema = z.object({
  id: z.string(),
  region: regionSchema,
  title: z.string(),
  summary: z.string(),
  level: courseLevelSchema,
  hours: z.number().positive(),
  language: z.string(),
  topics: z.array(z.string()),
  accessUrl: httpsUrlSchema,
  price: moneySchema,
  published: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type SellerCourse = z.infer<typeof sellerCourseSchema>;

export const sellerCourseListSchema = z.object({ courses: z.array(sellerCourseSchema) });

export type SellerCourseList = z.infer<typeof sellerCourseListSchema>;
