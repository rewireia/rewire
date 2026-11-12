import { randomUUID } from 'node:crypto';

import type { Money, OrderStatus } from '@rewire/contracts';

import type { Statement } from '../../platform/database.ts';

import type { ObservedPayment, RefundFact } from './gateway.ts';
import { ledgerRow, MATCHED, type Condition } from './ledger-row.ts';
import type { Order, SettlementSource } from './order-store.ts';
import { holdOnceSettled, releaseOnceEnded } from './purchase-holds.ts';
import { partialRefundStatements } from './refund-ledger.ts';

/**
 * The writes of each fact about an order. Every fact is one transaction that moves the order
 * and, only when it moves, appends its ledger row and changes its enrolment and its hold. A fact
 * that arrives late, or again, finds the order moved on and writes nothing.
 */

/** A capture as PayPal reported it: its id and the money it took. */
export interface CaptureFact {
  readonly captureId: string;
  readonly amount: Money;
}

/**
 * A payment as PayPal reported it: the reference of the money (a capture or an invoice), what was
 * really paid, and the refunds PayPal reports done on it.
 */
export interface PaidFact {
  readonly reference: string;
  readonly amount: Money;
  readonly refunds: readonly RefundFact[];
}

/** What PayPal reported that cannot be read with certainty, and why. */
export interface ReviewFact {
  readonly reference: string | undefined;
  readonly reason: string;
  readonly observed: ObservedPayment;
}

const UNPAID: readonly OrderStatus[] = ['created', 'pending'];

/** The ledger row of a payment, by how it was paid. */
const PAID_KINDS = {
  paypal: 'capture-completed',
  'employer-invoice': 'invoice-paid',
  wallet: 'wallet-paid',
} as const;

/**
 * The writes that record a paid order and enrol its learner, in one transaction. Only a payment
 * of exactly the order's amount and currency moves it: the ledger row records what PayPal
 * reported, which is then that amount. The hold and the enrolment depend on the order being paid
 * by this very transaction or before it: a refunded or failed order stays as it is, and opens
 * nothing. Refunds PayPal reports done on the payment are recorded with it. Exported so a
 * sponsorship can record its invoice as paid, and the wallet its payment, in the same transaction.
 */
export function paidStatements(
  order: Order,
  paid: PaidFact,
  source: SettlementSource,
  at: string,
): Statement[] {
  const kind = PAID_KINDS[order.method];
  const exact: Condition = {
    sql: `${MATCHED} AND currency = ? AND amount_minor = ?`,
    args: [paid.amount.currency, paid.amount.minorUnits],
  };
  return [
    ledgerRow(
      order,
      { kind, amount: paid.amount, reference: paid.reference },
      UNPAID,
      source,
      at,
      exact,
    ),
    {
      sql: `UPDATE orders SET status = 'completed', paypal_capture_id = ?, paid_at = ?
             WHERE id = ? AND status IN ('created', 'pending') AND ${exact.sql}`,
      args: [order.method === 'paypal' ? paid.reference : null, at, order.id, ...exact.args],
    },
    holdOnceSettled(order.id, at),
    {
      // A learner refunded for an earlier order who buys the course again gets it back with
      // this order. An order never brings back an enrolment of its own that was revoked.
      sql: `INSERT INTO enrolments (id, learner_id, course_id, order_id, status, started_at)
            SELECT lower(hex(randomblob(16))) || ?, o.learner_id,
                   COALESCE(i.course_id, o.course_id), o.id, 'active', ? FROM orders o
            LEFT JOIN order_items i ON i.order_id = o.id
             WHERE o.id = ? AND o.status = 'completed'
            ON CONFLICT (learner_id, course_id) DO UPDATE
              SET status = 'active', order_id = excluded.order_id, started_at = excluded.started_at
            WHERE enrolments.status = 'revoked' AND enrolments.order_id <> excluded.order_id`,
      args: [randomUUID(), at, order.id],
    },
    ...partialRefundStatements(order, paid.refunds, source, at),
  ];
}

/**
 * PayPal holds the money of a capture. Its id and amount are kept on the order, so a refund that
 * PayPal reports before it ever reports the capture completed still finds them.
 */
export function pendingStatements(
  order: Order,
  capture: CaptureFact,
  source: SettlementSource,
  at: string,
): Statement[] {
  const fact = { kind: 'capture-pending', amount: 'none', reference: capture.captureId } as const;
  return [
    ledgerRow(order, fact, ['created'], source, at),
    {
      sql: `UPDATE orders
               SET status = 'pending', paypal_capture_id = ?, captured_minor = ?,
                   captured_currency = ?
             WHERE id = ? AND status = 'created'`,
      args: [capture.captureId, capture.amount.minorUnits, capture.amount.currency, order.id],
    },
    holdOnceSettled(order.id, at),
  ];
}

/**
 * PayPal captured money that is not what the order asked for. Nothing is given for it: the
 * capture, with what it took, is kept on the order, which stays `pending` and keeps its course
 * until the refund of that capture is confirmed. Refunds PayPal reports done on it are recorded.
 */
export function mismatchStatements(
  order: Order,
  capture: CaptureFact & { readonly refunds: readonly RefundFact[] },
  source: SettlementSource,
  at: string,
): Statement[] {
  return [
    {
      sql: `UPDATE orders
               SET status = 'pending', paypal_capture_id = ?, captured_minor = ?,
                   captured_currency = ?, capture_mismatch = 1
             WHERE id = ? AND status IN ('created', 'pending') AND ${MATCHED}`,
      args: [capture.captureId, capture.amount.minorUnits, capture.amount.currency, order.id],
    },
    ledgerRow(
      order,
      { kind: 'capture-mismatched', amount: 'captured', reference: capture.captureId },
      ['pending'],
      source,
      at,
      { sql: 'capture_mismatch = 1', args: [] },
    ),
    holdOnceSettled(order.id, at),
    ...partialRefundStatements(order, capture.refunds, source, at),
  ];
}

/**
 * PayPal reported a payment Rewire cannot read with certainty. It is kept as received on an order
 * not yet paid, which stays `pending`, keeps its course and gives no access until a
 * reconciliation reads a payment or a refusal. Its ledger row moves no money: how much moved is
 * not known.
 */
export function reviewStatements(
  order: Order,
  review: ReviewFact,
  source: SettlementSource,
  at: string,
): Statement[] {
  const { observed } = review;
  const reference = review.reference ?? review.reason;
  const fact = { kind: `${kindOf(order)}-review`, amount: 'none', reference } as const;
  return [
    {
      sql: `UPDATE orders
               SET status = 'pending', paypal_capture_id = COALESCE(?, paypal_capture_id),
                   review_reason = ?, observed_status = ?, observed_currency = ?,
                   observed_value = ?
             WHERE id = ? AND status IN ('created', 'pending') AND ${MATCHED}`,
      args: [
        order.method === 'paypal' ? (review.reference ?? null) : null,
        review.reason,
        observed.status ?? null,
        observed.currency ?? null,
        observed.value ?? null,
        order.id,
      ],
    },
    ledgerRow(order, fact, ['pending'], source, at, {
      sql: `${MATCHED} AND review_reason = ?`,
      args: [review.reason],
    }),
    holdOnceSettled(order.id, at),
  ];
}

function kindOf(order: Order): 'capture' | 'invoice' {
  return order.method === 'paypal' ? 'capture' : 'invoice';
}

export function failedStatements(
  order: Order,
  reason: string,
  source: SettlementSource,
  at: string,
): Statement[] {
  const fact = { kind: 'capture-failed', amount: 'none', reference: reason } as const;
  const matched = { sql: MATCHED, args: [] };
  return [
    ledgerRow(order, fact, UNPAID, source, at, matched),
    {
      sql: `UPDATE orders SET status = 'failed'
             WHERE id = ? AND status IN ('created', 'pending') AND ${MATCHED}`,
      args: [order.id],
    },
    releaseOnceEnded(order.id),
  ];
}
