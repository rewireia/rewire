import type { Money } from '@rewire/contracts';

import type { Statement } from '../../platform/database.ts';

import type { RefundFact } from './gateway.ts';
import { CURRENCY, ledgerRow, MATCHED } from './ledger-row.ts';
import type { Order, SettlementSource } from './order-store.ts';
import { releaseOnceEnded } from './purchase-holds.ts';

/**
 * The writes of the refunds of an order: a refund PayPal accepted, declined, made in part from
 * the merchant's account, or completed. Each is one transaction, written only while the order is
 * in a state the fact may change, so a fact that comes late or again writes nothing.
 */

/** A capture refunded at PayPal, as PayPal reports it: what it took, and the refunds done. */
export interface RefundedCapture {
  readonly captureId: string;
  readonly amount: Money;
  readonly refunds: readonly RefundFact[];
  /** Whether it is not what the order asked for: then it never counted as paid. */
  readonly mismatch: boolean;
}

/** An order whose capture PayPal holds or completed, and whose money may go back. */
const REFUNDABLE = "status IN ('completed', 'pending') AND paypal_capture_id IS NOT NULL";

/** What the partial refunds recorded on the order gave back, as a negative amount. */
const PARTIALLY_REFUNDED = `(SELECT COALESCE(SUM(amount_minor), 0) FROM payment_events
   WHERE payment_events.order_id = orders.id AND kind = 'refund-partial')`;

/** What is left to give back of a capture once its partial refunds are counted. */
const REMAINING = `-(COALESCE(captured_minor, amount_minor) + ${PARTIALLY_REFUNDED})`;

/**
 * PayPal accepted a refund and has not sent the money back yet. The request is kept, once, on an
 * order that holds a capture; the order and its access do not change until it is completed.
 */
export function refundRequestedStatements(
  order: Order,
  refundId: string,
  source: SettlementSource,
  at: string,
): Statement[] {
  const held = 'paypal_capture_id IS NOT NULL AND refund_id IS NULL';
  return [
    ledgerRow(
      order,
      { kind: 'refund-requested', amount: 'none', reference: refundId },
      ['completed', 'pending'],
      source,
      at,
      { sql: held, args: [] },
    ),
    {
      sql: `UPDATE orders
               SET refund_id = ?, refund_status = 'pending', refund_requested_at = ?
             WHERE id = ? AND status IN ('completed', 'pending') AND ${held}`,
      args: [refundId, at, order.id],
    },
  ];
}

/**
 * PayPal declined or cancelled a refund, at once or after accepting it: no money went back. The
 * request is kept in the ledger with its failure, the order is as it was before (paid, or a
 * capture still to refund), and one more attempt is counted, so the next request goes to PayPal
 * under a new idempotency key.
 */
export function refundFailedStatements(
  order: Order,
  refundId: string,
  source: SettlementSource,
  at: string,
): Statement[] {
  const asked = "refund_id = ? AND refund_status = 'pending'";
  return [
    ...refundRequestedStatements(order, refundId, source, at),
    ledgerRow(
      order,
      { kind: 'refund-failed', amount: 'none', reference: refundId },
      ['completed', 'pending'],
      source,
      at,
      { sql: asked, args: [refundId] },
    ),
    {
      sql: `UPDATE orders
               SET refund_id = NULL, refund_status = NULL, refund_requested_at = NULL,
                   refund_attempts = refund_attempts + 1
             WHERE id = ? AND status IN ('completed', 'pending') AND ${asked}`,
      args: [order.id, refundId],
    },
  ];
}

/**
 * Refunds PayPal reports done on a capture that is still paid or held, made from the merchant's
 * PayPal account: each is recorded once, by its own id, with what PayPal says it gave back. A
 * refund Rewire asked for is recorded when the capture is refunded, not here.
 */
export function partialRefundStatements(
  order: Order,
  refunds: readonly RefundFact[],
  source: SettlementSource,
  at: string,
): Statement[] {
  return refunds.map(({ refundId, amount }) => ({
    sql: `INSERT OR IGNORE INTO payment_events
            (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
          SELECT id, 'refund-partial', ?, ?, ?, ?, ? FROM orders
           WHERE id = ? AND ${REFUNDABLE} AND ${CURRENCY} = ?
             AND (refund_id IS NULL OR refund_id <> ?)`,
    args: [
      -amount.minorUnits,
      amount.currency,
      refundId,
      source,
      at,
      order.id,
      amount.currency,
      refundId,
    ],
  }));
}

/**
 * The writes of a refund. Rewire refunds a capture in full, so the refund is known by the
 * capture it gives back, whoever reports it: the checkout, a webhook or a reconciliation. Its
 * ledger rows are written only by the transaction that moves the order to refunded.
 *
 * When PayPal reports the capture with it, a capture Rewire never saw (its answer was lost, the
 * tab was closed) is first taken onto the order with what PayPal says it took, and the refunds
 * PayPal lists are recorded. A capture held or first seen refunded is recorded as completed, since
 * PayPal refunds only a completed capture. The refund row gives back what the partial refunds
 * left: the ledger of the order sums to zero, with no amount PayPal did not report.
 */
export function refundedStatements(
  order: Order,
  source: SettlementSource,
  at: string,
  capture?: RefundedCapture,
): Statement[] {
  return [
    ...(capture === undefined ? [] : firstSeenStatements(order, capture, source, at)),
    {
      sql: `INSERT OR IGNORE INTO payment_events
              (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
            SELECT id, 'capture-completed', COALESCE(captured_minor, amount_minor), ${CURRENCY},
                   paypal_capture_id, ?, ? FROM orders
             WHERE id = ? AND status = 'pending' AND paypal_capture_id IS NOT NULL AND ${MATCHED}`,
      args: [source, at, order.id],
    },
    {
      sql: `INSERT OR IGNORE INTO payment_events
              (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
            SELECT id, 'refund-completed', ${REMAINING}, ${CURRENCY}, paypal_capture_id, ?, ?
              FROM orders
             WHERE id = ? AND ${REFUNDABLE}`,
      args: [source, at, order.id],
    },
    {
      sql: `UPDATE orders
               SET status = 'refunded', refunded_at = ?,
                   refund_status = CASE WHEN refund_id IS NULL THEN NULL ELSE 'completed' END
             WHERE id = ? AND ${REFUNDABLE}`,
      args: [at, order.id],
    },
    revokeOnceRefunded(order.id),
    releaseOnceEnded(order.id),
  ];
}

/**
 * The writes of the refund of an order paid from the wallet: no money moves at PayPal, the
 * amount goes back to the wallet, whose balance counts only orders still paid. Written only by
 * the transaction that moves the order from paid to refunded.
 */
export function returnedToWalletStatements(order: Order, at: string): Statement[] {
  const paid = "status = 'completed' AND method = 'wallet'";
  return [
    {
      sql: `INSERT OR IGNORE INTO payment_events
              (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
            SELECT id, 'refund-completed', -amount_minor, currency, ?, 'checkout', ? FROM orders
             WHERE id = ? AND ${paid}`,
      args: [walletReferenceOf(order.id), at, order.id],
    },
    {
      sql: `UPDATE orders SET status = 'refunded', refunded_at = ? WHERE id = ? AND ${paid}`,
      args: [at, order.id],
    },
    revokeOnceRefunded(order.id),
    releaseOnceEnded(order.id),
  ];
}

/** The ledger reference of a payment from the wallet, and of its refund. */
export function walletReferenceOf(orderId: string): string {
  return `wallet-${orderId}`;
}

/**
 * Access follows payment: a refund closes the course even when it was completed. The certificate
 * is not touched: it attests what was learnt and stays verifiable.
 */
function revokeOnceRefunded(orderId: string): Statement {
  return {
    sql: `UPDATE enrolments SET status = 'revoked'
           WHERE order_id = ? AND status IN ('active', 'completed')
             AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'refunded')`,
    args: [orderId, orderId],
  };
}

/**
 * Takes onto an order a capture PayPal reports already refunded: its id and what it took, on an
 * order that never saw it, or held it without an amount it could read. One that is not what the
 * order asked for is kept as such, with its row in the ledger.
 */
function firstSeenStatements(
  order: Order,
  capture: RefundedCapture,
  source: SettlementSource,
  at: string,
): Statement[] {
  const { captureId, amount } = capture;
  return [
    {
      sql: `UPDATE orders
               SET status = 'pending', paypal_capture_id = ?, captured_minor = ?,
                   captured_currency = ?, capture_mismatch = MAX(capture_mismatch, ?)
             WHERE id = ? AND (paypal_capture_id IS NULL OR paypal_capture_id = ?)
               AND (status = 'created' OR (status = 'pending' AND captured_minor IS NULL))`,
      args: [
        captureId,
        amount.minorUnits,
        amount.currency,
        capture.mismatch ? 1 : 0,
        order.id,
        captureId,
      ],
    },
    ledgerRow(
      order,
      { kind: 'capture-mismatched', amount: 'captured', reference: captureId },
      ['pending'],
      source,
      at,
      { sql: 'capture_mismatch = 1 AND paypal_capture_id = ?', args: [captureId] },
    ),
    ...partialRefundStatements(order, capture.refunds, source, at),
  ];
}
