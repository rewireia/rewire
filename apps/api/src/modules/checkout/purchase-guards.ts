import { HttpProblem } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';

import type { Order, OrderStore } from './order-store.ts';
import type { Hold } from './purchase-holds.ts';

/**
 * How long a call to PayPal may still be under way. Every call gives up well before (20 seconds),
 * so an attempt that has held a course this long without an answer was left unanswered.
 */
const ATTEMPT_ANSWERED_WITHIN_MS = 10 * 60 * 1000;

/** An order that holds a course while it is still `created`, as the guard found it. */
export interface HeldAttempt {
  readonly order: Order;
  readonly hold: Hold;
  /** Held long enough for every call it made to PayPal to have ended. */
  readonly stale: boolean;
}

/**
 * Asks PayPal what became of an attempt that may have been left unanswered and records it,
 * letting the course go when nothing can be paid. Each module settles the attempts it makes and
 * is told how to settle the others' through the container.
 */
export type SettleAttempt = (attempt: HeldAttempt) => Promise<void>;

export interface PurchaseGuardDependencies {
  readonly orders: Pick<OrderStore, 'find' | 'holderOf' | 'takeHold'>;
  readonly settleAttempt: SettleAttempt;
  readonly clock: Clock;
}

/** Whether something begun at this time has had long enough for PayPal to have answered it. */
export function isStale(since: string, now: Date): boolean {
  return now.getTime() - Date.parse(since) >= ATTEMPT_ANSWERED_WITHIN_MS;
}

/**
 * One way and one attempt to pay per course. A course is refused while another order of the
 * learner holds it: paid (409 `already_enrolled`), held by PayPal (409 `payment_pending`),
 * invoiced (409 `invoice_pending`) or being captured (409 `payment_in_progress`). An attempt left
 * unanswered is first settled at PayPal, so it holds the course only while it may still be paid.
 * Shared by the checkout and the employer's invoice, so both refuse the same things.
 */
export async function assertCanBuy(
  dependencies: PurchaseGuardDependencies,
  learnerId: string,
  courseId: string,
): Promise<void> {
  const holder = await liveHolder(dependencies, learnerId, courseId);
  if (holder !== undefined) {
    throw refusalOf(holder);
  }
}

/**
 * Takes the course for an order before PayPal is asked to capture it: the hold is what makes a
 * second capture of the course impossible. Throws the refusal of the order that holds it.
 */
export async function claimCourse(
  dependencies: PurchaseGuardDependencies,
  order: Order,
): Promise<Hold> {
  const { orders } = dependencies;
  const taken = await orders.takeHold(order);
  if (taken !== undefined) {
    return taken;
  }
  const holder = await liveHolder(dependencies, order.learnerId, order.courseId);
  const retaken = holder === undefined ? await orders.takeHold(order) : undefined;
  if (retaken !== undefined) {
    return retaken;
  }
  throw refusalOf(holder ?? (await currentHolder(dependencies, order.learnerId, order.courseId)));
}

/** The answer to an attempt that lost the course to another one being opened at the same time. */
export async function refusalFor(
  dependencies: PurchaseGuardDependencies,
  learnerId: string,
  courseId: string,
): Promise<HttpProblem> {
  return refusalOf(await currentHolder(dependencies, learnerId, courseId));
}

/** The order that holds the course once an unanswered attempt has been settled, if any. */
async function liveHolder(
  dependencies: PurchaseGuardDependencies,
  learnerId: string,
  courseId: string,
): Promise<Order | undefined> {
  const { orders, settleAttempt, clock } = dependencies;
  const hold = await orders.holderOf(learnerId, courseId);
  const order = hold === undefined ? undefined : await orders.find(hold.orderId);
  if (hold === undefined || order?.status !== 'created') {
    return order;
  }
  await settleAttempt({ order, hold, stale: isStale(hold.takenAt, clock()) });
  return currentHolder(dependencies, learnerId, courseId);
}

async function currentHolder(
  { orders }: PurchaseGuardDependencies,
  learnerId: string,
  courseId: string,
): Promise<Order | undefined> {
  const hold = await orders.holderOf(learnerId, courseId);
  return hold === undefined ? undefined : orders.find(hold.orderId);
}

function refusalOf(holder: Order | undefined): HttpProblem {
  if (holder?.status === 'completed') {
    return new HttpProblem({
      status: 409,
      code: 'already_enrolled',
      title: 'Already enrolled',
      detail: 'You already have this course.',
    });
  }
  if (holder?.status === 'pending') {
    return new HttpProblem({
      status: 409,
      code: 'payment_pending',
      title: 'Payment under review',
      detail: 'PayPal is still reviewing your earlier payment for this course.',
    });
  }
  if (holder?.method === 'employer-invoice') {
    return new HttpProblem({
      status: 409,
      code: 'invoice_pending',
      title: 'Invoice already sent',
      detail:
        'Your employer has an open invoice for this course. Cancel that request before paying yourself.',
    });
  }
  return new HttpProblem({
    status: 409,
    code: 'payment_in_progress',
    title: 'Payment in progress',
    detail: 'Another payment for this course is being completed. Try again in a few minutes.',
  });
}
