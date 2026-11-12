import { z } from 'zod';

import { currencySchema, moneySchema, regionSchema } from './region.ts';

/** An intentionally public, fictional buyer for a PayPal sandbox demonstration. */
export const sandboxBuyerSchema = z.object({
  email: z.email().regex(/^[^@]+@personal\.example\.com$/i),
  password: z.string().min(1),
});

/** What the browser needs to show PayPal's buttons for a region. */
export const paymentConfigSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    environment: z.enum(['sandbox', 'live']),
    /** PayPal client id of the merchant that sells in the region. Public by design. */
    clientId: z.string(),
    currency: currencySchema,
    sandboxBuyer: sandboxBuyerSchema.optional(),
  }),
  /** The server has no PayPal credentials: it says so instead of pretending to sell. */
  z.object({ available: z.literal(false), reason: z.string() }),
]);

export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const startOrderRequestSchema = z.object({
  courseIds: z.array(z.string().min(1).max(80)).min(1).max(10).optional(),
  courseId: z.string().min(1).max(80),
  region: regionSchema,
});

export type StartOrderRequest = z.infer<typeof startOrderRequestSchema>;

/** A purchase the server has opened with PayPal. The amount is the server's, never the browser's. */
export const startedOrderSchema = z.object({
  orderId: z.string(),
  paypalOrderId: z.string(),
  amount: moneySchema,
});

export type StartedOrder = z.infer<typeof startedOrderSchema>;

export const orderStatusSchema = z.enum(['created', 'pending', 'completed', 'failed', 'refunded']);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

/**
 * Why a payment is not complete.
 *
 * - `held-by-paypal`: PayPal has the money and is reviewing it, or the seller must accept it.
 * - `declined`: PayPal or the buyer's bank refused the payment.
 * - `not-approved`: the buyer has not approved the order at PayPal.
 * - `mismatch`: what PayPal captured is not what the server asked for; nobody is enrolled.
 * - `needs-review`: PayPal reported a capture the server cannot read with certainty. The money is
 *   not taken as missing: the course stays held, nobody is enrolled, and a reconciliation settles
 *   it.
 */
export const paymentIssueSchema = z.enum([
  'held-by-paypal',
  'declined',
  'not-approved',
  'mismatch',
  'needs-review',
]);

export type PaymentIssue = z.infer<typeof paymentIssueSchema>;

/** How an order stands. Access to the course is given only when it is `completed`. */
export const captureResultSchema = z.object({
  orderId: z.string(),
  status: orderStatusSchema,
  courseId: z.string(),
  issue: paymentIssueSchema.nullable(),
});

export type CaptureResult = z.infer<typeof captureResultSchema>;

export const paymentMethodSchema = z.enum(['paypal', 'employer-invoice', 'wallet']);

/**
 * Where the refund of a payment stands: `none` asked, `requested` (PayPal accepted it and has not
 * sent the money back yet), or `completed` (the money is back).
 */
export const paymentRefundSchema = z.enum(['none', 'requested', 'completed']);

export type PaymentRefund = z.infer<typeof paymentRefundSchema>;

/** A line of the learner's payment history. */
export const paymentSchema = z.object({
  orderId: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  method: paymentMethodSchema,
  /** Who sold the course: the marketplace's one seller. The server always sends it. */
  seller: z.string().optional(),
  amount: moneySchema,
  status: orderStatusSchema,
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  refundedAt: z.iso.datetime().nullable(),
  /** PayPal's own reference of the money movement, as it appears in the payer's account. */
  paypalReference: z.string().nullable(),
  /** Whether the money-back guarantee still applies. */
  refundable: z.boolean(),
  /** Where its refund stands. The server always sends it; an answer without it means `none`. */
  refund: paymentRefundSchema.optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const paymentListSchema = z.object({
  payments: z.array(paymentSchema),
  /** Days after payment during which an unfinished course can be refunded. */
  refundWindowDays: z.number().int(),
});

export type PaymentList = z.infer<typeof paymentListSchema>;
