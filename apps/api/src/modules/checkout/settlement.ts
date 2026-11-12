import type { CaptureResult, PaymentIssue, Region } from '@rewire/contracts';

import type { Logger } from '../../logger.ts';

import type { CaptureOutcome, PaymentGateway } from './gateway.ts';
import { sameMoney } from './money.ts';
import type { Order, OrderStore, SettlementSource } from './order-store.ts';
import { refundRequestIdOf } from './refund-policy.ts';

/** Records the outcome of a capture, whoever reported it, and says how the order stands. */
export type Settle = (
  order: Order,
  outcome: CaptureOutcome,
  source: SettlementSource,
) => Promise<CaptureResult>;

/**
 * The one place where what PayPal reports becomes a change of the order. The checkout, the
 * webhook and a reconciliation all go through it, so the same fact has the same effect.
 *
 * A capture that does not match its order gives no access and is not dropped: it is kept with
 * what it took, the course stays held and the capture is refunded. Until PayPal has accepted
 * that refund, it is asked again, under the same idempotency key, each time the order is read;
 * once accepted, the order is refunded when PayPal reports the capture refunded.
 *
 * A capture PayPal reports that cannot be read with certainty is neither paid nor refused: it is
 * kept in review with what PayPal sent, holds the course and gives no access.
 */
export function createSettle(
  orders: OrderStore,
  gatewayOf: (region: Region) => PaymentGateway,
  logger: Logger,
): Settle {
  const parts = { orders, gatewayOf, logger };
  return async (order, outcome, source) => {
    const issue = await record(parts, order, outcome, source);
    const current = (await orders.find(order.id)) ?? order;
    // A reading in review leaves a paid order as it is: it is in review only while unpaid.
    return resultOf(
      current,
      issue === 'needs-review' && current.status !== 'pending' ? null : issue,
    );
  };
}

/** What settling needs. */
interface SettleParts {
  readonly orders: OrderStore;
  readonly gatewayOf: (region: Region) => PaymentGateway;
  readonly logger: Logger;
}

/** Records one outcome on the order, and says what keeps the payment from being complete. */
async function record(
  parts: SettleParts,
  order: Order,
  outcome: CaptureOutcome,
  source: SettlementSource,
): Promise<PaymentIssue | null> {
  const { orders, logger } = parts;
  switch (outcome.status) {
    case 'completed':
      if (isWhatWasAsked(order, outcome)) {
        const { captureId: reference, amount, refunds } = outcome;
        await orders.recordPaid(order, { reference, amount, refunds }, source);
        return null;
      }
      logger.error('capture does not match the order', {
        orderId: order.id,
        captureId: outcome.captureId,
      });
      await orders.recordMismatch(order, outcome, source);
      await refundMismatch(parts, order, outcome.captureId, source);
      return 'mismatch';
    case 'pending':
      await orders.recordPending(order, outcome, source);
      return 'held-by-paypal';
    case 'failed':
      await orders.recordFailed(order, outcome.reason, source);
      return 'declined';
    case 'refunded': {
      // Refunded by Rewire or from the merchant's PayPal account: the same fact either way.
      // A capture never seen before is recorded first, with what PayPal says it took.
      const mismatch = !isWhatWasAsked(order, outcome);
      await orders.recordRefunded(order, source, { ...outcome, mismatch });
      return null;
    }
    case 'review': {
      const { captureId: reference, reason, observed } = outcome;
      logger.error('capture could not be read with certainty', { orderId: order.id, reason });
      await orders.recordReview(order, { reference, reason, observed }, source);
      return 'needs-review';
    }
    case 'not-captured':
      return 'not-approved';
  }
}

/**
 * Refunds a capture that does not match its order, under the key of the order's current attempt,
 * unless a refund is already under way. A refund PayPal declines is recorded, so the next reading
 * asks again under a new key.
 */
async function refundMismatch(
  { orders, gatewayOf, logger }: SettleParts,
  order: Order,
  captureId: string,
  source: SettlementSource,
): Promise<void> {
  const current = await orders.find(order.id);
  if (current?.status !== 'pending' || !current.captureMismatch || current.refund !== undefined) {
    return;
  }
  try {
    const refund = await gatewayOf(order.region).refundCapture(
      captureId,
      refundRequestIdOf(current),
    );
    if (refund.status === 'completed') {
      await orders.recordRefunded(order, source);
    } else if (refund.status === 'pending') {
      await orders.recordRefundRequested(order, refund.refundId, source);
    } else {
      await orders.recordRefundFailed(order, refund.refundId, source);
    }
  } catch (error) {
    logger.error('refund of a capture that does not match could not be asked', {
      orderId: order.id,
      captureId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** How an order stands, as the checkout answers it. */
export function resultOf(order: Order, issue: PaymentIssue | null = null): CaptureResult {
  return { orderId: order.id, status: order.status, courseId: order.courseId, issue };
}

/** PayPal must have captured exactly what the server asked for, for this very order. */
function isWhatWasAsked(
  order: Order,
  outcome: Extract<CaptureOutcome, { status: 'completed' | 'refunded' }>,
): boolean {
  const sameOrder = outcome.orderId === undefined || outcome.orderId === order.id;
  return sameOrder && sameMoney(outcome.amount, order.amount);
}
