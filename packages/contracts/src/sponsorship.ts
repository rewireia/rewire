import { z } from 'zod';

import { moneySchema, regionSchema } from './region.ts';

/** A learner asks their employer to pay for a course. */
export const sponsorshipRequestSchema = z.object({
  courseId: z.string().min(1).max(80),
  region: regionSchema,
  employerEmail: z.email().max(254),
  employerName: z.string().trim().min(1).max(120).optional(),
});

export type SponsorshipRequest = z.infer<typeof sponsorshipRequestSchema>;

export const sponsorshipStatusSchema = z.enum(['sent', 'paid', 'cancelled']);

/** A PayPal invoice sent to an employer. The course opens when PayPal says it is paid. */
export const sponsorshipSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  amount: moneySchema,
  status: sponsorshipStatusSchema,
  invoiceNumber: z.string(),
  /** The page where the employer reads and pays the invoice. */
  payUrl: z.url().nullable(),
  sentAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  /**
   * PayPal reported the invoice paid, but not as asked: in part, another amount or currency, or
   * marked as paid by hand. It opens nothing and waits for review; its status stays `sent`. The
   * server always sends it; an answer without it means `false`.
   */
  inReview: z.boolean().optional(),
});

export type Sponsorship = z.infer<typeof sponsorshipSchema>;

export const sponsorshipListSchema = z.object({ sponsorships: z.array(sponsorshipSchema) });

export type SponsorshipList = z.infer<typeof sponsorshipListSchema>;
