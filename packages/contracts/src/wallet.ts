import { z } from 'zod';

import { paymentIssueSchema } from './checkout.ts';
import { currencySchema, moneySchema, regionSchema } from './region.ts';

/** The smallest top-up, in the minor unit of the region's currency: 5.00. */
export const TOP_UP_MINIMUM_MINOR = 500;
/** The largest top-up, in the minor unit of the region's currency: 500.00. */
export const TOP_UP_MAXIMUM_MINOR = 50_000;

/** Money a learner asks to add to their wallet with PayPal. The server checks the limits. */
export const topUpRequestSchema = z.object({
  region: regionSchema,
  amountMinor: z.number().int().min(TOP_UP_MINIMUM_MINOR).max(TOP_UP_MAXIMUM_MINOR),
});

export type TopUpRequest = z.infer<typeof topUpRequestSchema>;

/** A top-up the server has opened with PayPal, for the learner to approve. */
export const startedTopUpSchema = z.object({
  topUpId: z.string(),
  paypalOrderId: z.string(),
  amount: moneySchema,
});

export type StartedTopUp = z.infer<typeof startedTopUpSchema>;

/**
 * Where a top-up stands. Only `completed` adds to the balance. `pending`: PayPal holds the money.
 * `mismatched`: PayPal captured another amount, which is given back and never added; `refunded`
 * once PayPal confirms it went back.
 */
export const topUpStatusSchema = z.enum([
  'created',
  'pending',
  'completed',
  'failed',
  'mismatched',
  'refunded',
]);

export type TopUpStatus = z.infer<typeof topUpStatusSchema>;

/** How a top-up stands after a capture or a reading at PayPal. */
export const topUpResultSchema = z.object({
  topUpId: z.string(),
  status: topUpStatusSchema,
  amount: moneySchema,
  issue: paymentIssueSchema.nullable(),
});

export type TopUpResult = z.infer<typeof topUpResultSchema>;

/** Courses to pay for from the balance. The server sets every price. */
export const walletPaymentRequestSchema = z.object({
  region: regionSchema,
  courseIds: z.array(z.string().min(1).max(80)).min(1).max(10),
});

export type WalletPaymentRequest = z.infer<typeof walletPaymentRequestSchema>;

/** One line of the wallet: money added, a course paid from it, or a refund back to it. */
export const walletMovementSchema = z.object({
  id: z.string(),
  kind: z.enum(['top-up', 'course-payment', 'refund']),
  currency: currencySchema,
  /** Signed: positive when money comes in, negative when it is spent. */
  amountMinor: z.number().int(),
  status: z.enum(['pending', 'completed', 'failed', 'mismatched', 'refunded']),
  occurredAt: z.iso.datetime(),
  /** PayPal's reference of the money movement, for a top-up captured at PayPal. */
  paypalReference: z.string().nullable(),
  /** The courses paid or refunded; `null` for a top-up. */
  title: z.string().nullable(),
});

export type WalletMovement = z.infer<typeof walletMovementSchema>;

export const walletMovementsSchema = z.object({ movements: z.array(walletMovementSchema) });

export type WalletMovements = z.infer<typeof walletMovementsSchema>;
