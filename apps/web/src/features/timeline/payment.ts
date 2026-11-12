import type { PlannedCourse, Region } from '@rewire/contracts';

import type { Language } from '../../app/preferences.ts';
import type { MessageKey } from '../../i18n/en.ts';
import { formatDate, formatMoney, type MessageValues } from '../../i18n/format.ts';

/** A course of the demonstration catalogue: the only kind that is paid for. */
export type PaidCourse = Extract<PlannedCourse, { kind: 'paid' }>;

interface Words {
  readonly t: (key: MessageKey, values?: MessageValues) => string;
  readonly language: Language;
}

/** Whether a course waits for its payment: it cannot start until it is paid for. */
export function isWaiting(course: PlannedCourse): boolean {
  return course.booking?.heldByPayment === true && course.payment !== 'paid';
}

/** Whether a course started late because it was paid for late. */
function startedWhenPaid(course: PlannedCourse): boolean {
  return course.booking?.heldByPayment === true && course.payment === 'paid';
}

/**
 * The day the payment milestone stands on: the day it was paid, or else the day the course
 * needs it to start. `null` for a course out of the plan.
 */
export function milestoneDay(course: PaidCourse): string | null {
  if (course.booking === null) {
    return null;
  }
  return course.payment === 'paid' && course.paidOn !== null
    ? course.paidOn
    : course.booking.startsOn;
}

/**
 * Where the learner acts on a payment: the course's page to pay it, the dashboard where the
 * invoice and the payments are followed, or the course itself once paid for.
 */
export function paymentHref(region: Region, course: PaidCourse): string {
  switch (course.payment) {
    case 'due':
    case 'refunded':
      return `/${region}/courses/${encodeURIComponent(course.id)}`;
    case 'held-by-paypal':
    case 'invoice-sent':
      return '/dashboard';
    case 'paid':
      return `/learn/${encodeURIComponent(course.id)}`;
  }
}

/** Where the payment stands, in words: "Paid on 12 November 2026". */
export function paymentStatus({ t, language }: Words, course: PaidCourse): string {
  if (course.payment === 'paid') {
    return course.paidOn === null
      ? t('timeline.payment.paid')
      : t('timeline.payment.paidOn', { date: formatDate(course.paidOn, language) });
  }
  return t(`timeline.payment.${course.payment}`);
}

/** The name of a payment milestone: "PayPal · $19". */
export function paymentName({ t, language }: Words, course: PaidCourse): string {
  return t('timeline.payment.name', { price: formatMoney(course.price, language) });
}

/** What the learner can do about the payment, as the words of its link. */
export function paymentAction({ t }: Words, course: PaidCourse): string {
  return t(`timeline.payment.action.${course.payment}`);
}

/** Why a course waits or started late, in one sentence; `null` when its payment holds nothing. */
export function heldSentence({ t }: Words, course: PlannedCourse): string | null {
  if (isWaiting(course)) {
    return t('timeline.held.waiting');
  }
  return startedWhenPaid(course) ? t('timeline.held.startedWhenPaid') : null;
}
