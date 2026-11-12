import type { Order } from './order-store.ts';

/** Days after payment during which a course not yet completed can be refunded in full. */
export const REFUND_WINDOW_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The money-back guarantee: a payment with PayPal or from the wallet, completed, within the
 * window, for a course the learner has not completed, and not already being refunded.
 */
export function isRefundable(order: Order, enrolment: string | undefined, now: Date): boolean {
  if (
    order.method === 'employer-invoice' ||
    order.status !== 'completed' ||
    order.paidAt === undefined ||
    order.refund !== undefined
  ) {
    return false;
  }
  const daysSincePayment =
    (now.getTime() - new Date(order.paidAt).getTime()) / MILLISECONDS_PER_DAY;
  return daysSincePayment <= REFUND_WINDOW_DAYS && enrolment !== 'completed';
}

/**
 * The idempotency key of the next refund of an order. A refund PayPal declined would be answered
 * again under its key, so each declined attempt moves the next request to a new one; the first
 * keeps the key of every order refunded before attempts were counted.
 */
export function refundRequestIdOf(order: Pick<Order, 'id' | 'refundAttempts'>): string {
  return order.refundAttempts === 0
    ? `refund-${order.id}`
    : `refund-${order.id}-${order.refundAttempts + 1}`;
}
