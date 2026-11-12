import type { CaptureResult, Region } from '@rewire/contracts';

import { HttpProblem } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';
import type { EnrolmentStore } from '../learning/enrolment-store.ts';

import { PaymentGatewayError, type PaymentGateway } from './gateway.ts';
import { asProblem, withGateway } from './gateway-problems.ts';
import type { Order, OrderStore, SettlementSource } from './order-store.ts';
import { isRefundable, REFUND_WINDOW_DAYS, refundRequestIdOf } from './refund-policy.ts';
import { resultOf } from './settlement.ts';

/** What asking for and following a refund needs. */
interface RefundParts {
  readonly orders: OrderStore;
  readonly enrolments: EnrolmentStore;
  readonly gatewayOf: (region: Region) => PaymentGateway;
  readonly orderOf: (learnerId: string, orderId: string) => Promise<Order>;
  readonly clock: Clock;
}

/**
 * The money-back guarantee. The refund is asked of PayPal under the key of the order's current
 * attempt, then recorded as PayPal answers it: completed, pending, or declined, which counts the
 * attempt and is answered as a 502, so the learner may ask again under a new key. An order paid
 * from the wallet is refunded to the wallet at once.
 */
export async function requestRefund(
  { orderOf, enrolments, gatewayOf, orders, clock }: RefundParts,
  learnerId: string,
  orderId: string,
): Promise<CaptureResult> {
  const order = await orderOf(learnerId, orderId);
  if (order.refund?.status === 'pending') {
    throw new HttpProblem({
      status: 409,
      code: 'refund_in_progress',
      title: 'Refund already requested',
      detail: 'PayPal is still sending this refund back. It shows here once it is done.',
    });
  }
  const enrolled = (await enrolments.listByLearner(learnerId)).filter(
    (item) => item.orderId === order.id,
  );
  const enrolment = enrolled.find((item) => item.status === 'completed') ?? enrolled[0];
  const paid = order.method === 'wallet' || order.paypalCaptureId !== undefined;
  if (!paid || !isRefundable(order, enrolment?.status, clock())) {
    throw new HttpProblem({
      status: 409,
      code: 'refund_not_allowed',
      title: 'Refund not allowed',
      detail: `A course can be refunded within ${REFUND_WINDOW_DAYS} days of payment, before it is completed.`,
    });
  }
  if (order.paypalCaptureId === undefined) {
    // Paid from the wallet: the money goes back to the wallet, without asking PayPal.
    await orders.recordReturnedToWallet(order);
    return resultOf((await orders.find(order.id)) ?? order);
  }
  const captureId = order.paypalCaptureId;
  const gateway = gatewayOf(order.region);
  const refunded = await withGateway(() =>
    gateway.refundCapture(captureId, refundRequestIdOf(order)),
  );
  switch (refunded.status) {
    case 'pending':
      // PayPal has not sent the money back yet: the request is kept and the course stays open.
      // A webhook or a refresh reads the refund by its id and records how it ends.
      await orders.recordRefundRequested(order, refunded.refundId, 'checkout');
      return { ...resultOf(order), issue: 'held-by-paypal' };
    case 'failed':
      await orders.recordRefundFailed(order, refunded.refundId, 'checkout');
      throw asProblem(new PaymentGatewayError('REFUND_DECLINED'));
    case 'completed':
      await orders.recordRefunded(order, 'checkout');
      return resultOf((await orders.find(order.id)) ?? order);
  }
}

/**
 * Reads at PayPal, by its id, a refund the order is waiting for, and records how it ended. Returns
 * the order as it stands after.
 */
export async function settleRefund(
  { gatewayOf, orders }: Pick<RefundParts, 'gatewayOf' | 'orders'>,
  order: Order,
  source: SettlementSource,
): Promise<Order> {
  const { refund } = order;
  if (refund?.status !== 'pending') {
    return order;
  }
  const standing = await withGateway(() => gatewayOf(order.region).readRefund(refund.id));
  if (standing.status === 'pending') {
    return order;
  }
  await (standing.status === 'completed'
    ? orders.recordRefunded(order, source)
    : orders.recordRefundFailed(order, refund.id, source));
  return (await orders.find(order.id)) ?? order;
}
