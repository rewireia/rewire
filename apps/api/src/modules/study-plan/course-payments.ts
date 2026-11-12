import type { PlannedCourse } from '@rewire/contracts';

import type { Order } from '../checkout/order-store.ts';

import { dayOf } from './calendar-day.ts';

type PaidCourse = Extract<PlannedCourse, { kind: 'paid' }>;

/** Where the payment of a course stands, and the day it was paid for when it has been. */
export type CoursePayment = Pick<PaidCourse, 'payment' | 'paidOn'>;

const NOT_PAID: CoursePayment = { payment: 'due', paidOn: null };

/**
 * Where the payment of each course stands, read from the learner's orders. A completed
 * payment counts first; then one PayPal is still holding, or an invoice the employer has
 * yet to pay; then a refund. A checkout opened and never approved is no payment at all.
 */
export function coursePayments(orders: readonly Order[]): (courseId: string) => CoursePayment {
  const payments = new Map<string, CoursePayment>();
  for (const [courseId, courseOrders] of Map.groupBy(orders, (order) => order.courseId)) {
    payments.set(courseId, paymentOf(courseOrders));
  }
  return (courseId) => payments.get(courseId) ?? NOT_PAID;
}

function paymentOf(orders: readonly Order[]): CoursePayment {
  const completed = orders.find((order) => order.status === 'completed');
  if (completed?.paidAt !== undefined) {
    return { payment: 'paid', paidOn: dayOf(new Date(completed.paidAt)) };
  }
  if (orders.some((order) => order.method === 'paypal' && order.status === 'pending')) {
    return { payment: 'held-by-paypal', paidOn: null };
  }
  // An invoice is open from the moment its order is, until it is paid, cancelled or fails.
  const invoiceOpen = orders.some(
    (order) =>
      order.method === 'employer-invoice' &&
      (order.status === 'created' || order.status === 'pending'),
  );
  if (invoiceOpen) {
    return { payment: 'invoice-sent', paidOn: null };
  }
  return orders.some((order) => order.status === 'refunded')
    ? { payment: 'refunded', paidOn: null }
    : NOT_PAID;
}
