import {
  currencySchema,
  orderStatusSchema,
  paymentMethodSchema,
  regionSchema,
} from '@rewire/contracts';
import { z } from 'zod';

import type { Order, PaymentReview, RefundRequest } from './order-store.ts';

/** An order as the database holds it, read with a schema. */
export const orderRowSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  course_id: z.string(),
  items_json: z.string().optional(),
  region: regionSchema,
  method: paymentMethodSchema,
  currency: currencySchema,
  amount_minor: z.number().int(),
  status: orderStatusSchema,
  paypal_order_id: z.string().nullable(),
  paypal_capture_id: z.string().nullable(),
  captured_minor: z.number().int().nullable(),
  captured_currency: currencySchema.nullable(),
  capture_mismatch: z.union([z.literal(0), z.literal(1)]),
  refund_id: z.string().nullable(),
  refund_status: z.enum(['pending', 'completed']).nullable(),
  refund_requested_at: z.string().nullable(),
  refund_attempts: z.number().int().nonnegative(),
  review_reason: z.string().nullable(),
  observed_status: z.string().nullable(),
  observed_currency: z.string().nullable(),
  observed_value: z.string().nullable(),
  created_at: z.string(),
  paid_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
});

export const ORDER_COLUMNS = `id, learner_id, course_id, region, method, currency, amount_minor, status,
  paypal_order_id, paypal_capture_id, captured_minor, captured_currency, capture_mismatch,
  refund_id, refund_status, refund_requested_at, refund_attempts, review_reason, observed_status,
  observed_currency, observed_value, created_at, paid_at, refunded_at,
  (SELECT json_group_array(json_object('courseId', i.course_id, 'amountMinor', i.amount_minor))
    FROM order_items i WHERE i.order_id = orders.id) items_json`;

export function orderOf(row: z.infer<typeof orderRowSchema>): Order {
  return {
    id: row.id,
    learnerId: row.learner_id,
    courseId: row.course_id,
    ...(row.items_json && row.items_json !== '[]'
      ? {
          items: z
            .array(
              z.object({
                courseId: z.string(),
                amountMinor: z.number().int().positive(),
              }),
            )
            .parse(JSON.parse(row.items_json)),
        }
      : {}),
    region: row.region,
    method: row.method,
    amount: { currency: row.currency, minorUnits: row.amount_minor },
    status: row.status,
    paypalOrderId: row.paypal_order_id ?? undefined,
    paypalCaptureId: row.paypal_capture_id ?? undefined,
    capturedAmount:
      row.captured_minor === null
        ? undefined
        : { currency: row.captured_currency ?? row.currency, minorUnits: row.captured_minor },
    captureMismatch: row.capture_mismatch === 1,
    refund: refundOf(row),
    refundAttempts: row.refund_attempts,
    review: reviewOf(row),
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
  };
}

function refundOf(row: z.infer<typeof orderRowSchema>): RefundRequest | undefined {
  return row.refund_id === null || row.refund_status === null || row.refund_requested_at === null
    ? undefined
    : { id: row.refund_id, status: row.refund_status, requestedAt: row.refund_requested_at };
}

function reviewOf(row: z.infer<typeof orderRowSchema>): PaymentReview | undefined {
  return row.review_reason === null
    ? undefined
    : {
        reason: row.review_reason,
        status: row.observed_status ?? undefined,
        currency: row.observed_currency ?? undefined,
        value: row.observed_value ?? undefined,
      };
}
