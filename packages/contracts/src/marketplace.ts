import { z } from 'zod';
import { moneySchema, regionSchema } from './region.ts';
import { unitGroupCodeSchema } from './occupation.ts';
import { pathwayStageSchema } from './catalogue.ts';
import { paymentMethodSchema } from './checkout.ts';
import { catalogueOfferSchema } from './offers.ts';

/** The terms the demonstration seller sets for a course: one sandbox price, and whether it sells. */
export const marketTermsSchema = z.object({
  courseId: z.string().min(1).max(80),
  region: regionSchema,
  priceMinor: z.number().int().min(100).max(100_000),
  published: z.boolean(),
});
/** A course the demonstration seller offers, with its terms. `provider` is who wrote it. */
export const marketCourseSchema = marketTermsSchema.extend({
  title: z.string(),
  currency: moneySchema.shape.currency,
  kind: z.enum(['hosted', 'listed']),
  provider: z.string(),
  languages: z.array(z.string()),
  hours: z.number().positive().nullable(),
  /** The discount running now; `priceMinor` is then the discounted price everyone pays. */
  offer: catalogueOfferSchema.nullable(),
});
export type MarketCourse = z.infer<typeof marketCourseSchema>;
export const marketCatalogueSchema = z.object({ courses: z.array(marketCourseSchema) });
/** The relevant courses at the seller's fixed price, and whether the wallet covers each. */
export const trainingCourseSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  summary: z.string(),
  currency: moneySchema.shape.currency,
  priceMinor: z.number().int().positive(),
  affordable: z.boolean(),
  stage: pathwayStageSchema,
  hours: z.number().positive(),
});
export type TrainingCourse = z.infer<typeof trainingCourseSchema>;
/** The courses of the plan as the learner sees them. */
export interface TrainingCourses {
  courses: TrainingCourse[];
}
/**
 * The learner's wallet in one region: money added with PayPal (`fundedMinor`), paid from it for
 * courses net of refunds (`spentMinor`), and what is left to spend (`availableMinor`).
 */
export const walletSchema = z.object({
  region: regionSchema,
  fundedMinor: z.number().int().nonnegative(),
  spentMinor: z.number().int().nonnegative(),
  availableMinor: z.number().int().nonnegative(),
  currency: moneySchema.shape.currency,
});
export type Wallet = z.infer<typeof walletSchema>;
/** The plan's training: the region and the occupation it is for. */
export const trainingQuerySchema = z.object({
  region: regionSchema,
  isco08: unitGroupCodeSchema,
});
/** Where a sale stands: paid, held by PayPal for review, or given back in full. */
export const marketSaleStatusSchema = z.enum(['completed', 'pending', 'refunded']);
/**
 * One course sold, read from the order ledger: an order of several courses is one sale per
 * course, at the price fixed for it. A sale of a one-course order keeps the order's id.
 * `refundedMinor` is what went back of it: all of it once refunded, its share of the partial
 * refunds of the order before that.
 */
export const marketSaleSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  courseId: z.string(),
  title: z.string(),
  /** Who wrote the course, and whether Rewire hosts it; null for a course no longer sold. */
  provider: z.string().nullable(),
  kind: z.enum(['hosted', 'listed']).nullable(),
  method: paymentMethodSchema,
  amount: moneySchema,
  refundedMinor: z.number().int().nonnegative(),
  status: marketSaleStatusSchema,
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  refundedAt: z.iso.datetime().nullable(),
  /** PayPal's own reference of the capture; none for a payment from the wallet balance. */
  paypalReference: z.string().nullable(),
});
/**
 * The sales of one currency, summed by the server: `netMinor` is what the paid sales keep after
 * partial refunds, `reviewMinor` what PayPal still holds, `refundedMinor` everything given back.
 */
export const marketSalesTotalSchema = z.object({
  currency: moneySchema.shape.currency,
  netMinor: z.number().int().nonnegative(),
  reviewMinor: z.number().int().nonnegative(),
  refundedMinor: z.number().int().nonnegative(),
  sold: z.number().int().nonnegative(),
  refunds: z.number().int().nonnegative(),
  /** The net amount of a paid sale on average; null without paid sales. */
  averageMinor: z.number().int().nonnegative().nullable(),
});
export const marketSalesSchema = z.object({
  /** The demonstration seller every sale is made by. */
  seller: z.string(),
  sales: z.array(marketSaleSchema),
  totals: z.array(marketSalesTotalSchema),
});
export type MarketSale = z.infer<typeof marketSaleSchema>;
export type MarketSales = z.infer<typeof marketSalesSchema>;
export type MarketSalesTotal = z.infer<typeof marketSalesTotalSchema>;

export const courseSearchInputSchema = trainingQuerySchema.extend({
  language: z.enum(['en', 'es']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  goal: z.enum(['current-job', 'career-change', 'explore']),
  weeklyHours: z.number().int().min(1).max(20),
  exclude: z.array(z.string().max(80)).max(30).default([]),
  /** The most the learner means to spend on the plan. Without it, the wallet balance. */
  budgetMinor: z.number().int().min(0).max(100_000).optional(),
});
export type CourseSearchInput = z.infer<typeof courseSearchInputSchema>;
export const courseRecommendationsSchema = z.object({
  courses: z.array(trainingCourseSchema).length(3),
  engine: z.enum(['ai', 'rules']),
  totalMinor: z.number().int().positive(),
});
export type CourseRecommendations = z.infer<typeof courseRecommendationsSchema>;

/** The courses chosen for the plan; an empty list takes out every course not yet bought. */
export const roadmapInputSchema = z.object({
  region: regionSchema,
  courseIds: z.array(z.string().min(1).max(80)).max(3),
});
export const roadmapSchema = z.object({
  courses: z.array(
    z.object({
      courseId: z.string(),
      title: z.string(),
      date: z.iso.date(),
      /** Hours the provider states; null when it states none. */
      hours: z.number().positive().nullable(),
      price: moneySchema,
      status: z.enum(['selected', 'active', 'completed', 'revoked']),
    }),
  ),
});
export type RoadmapCourse = z.infer<typeof roadmapSchema>['courses'][number];
