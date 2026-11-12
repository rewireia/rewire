import type { PlannedCourse, StudyPlan, StudyTimeline } from '@rewire/contracts';

import type { ChartNames } from '../src/features/timeline/gantt-data.ts';
import { paymentName } from '../src/features/timeline/payment.ts';
import { translate, type MessageValues } from '../src/i18n/format.ts';
import type { MessageKey } from '../src/i18n/en.ts';

/*
 * A small plan in time, as the server answers it, for the tests of the timeline: two free
 * courses, one of them moved, one left out, and a paid one half done.
 */

type FreeCourse = Extract<PlannedCourse, { kind: 'free' }>;
type PaidCourse = Extract<PlannedCourse, { kind: 'paid' }>;

/** The days of a course, moved by the learner or not, and never held by a payment. */
export function booking(
  startsOn: string,
  endsOn: string,
  moved = false,
): NonNullable<FreeCourse['booking']> {
  return { startsOn, endsOn, moved, heldByPayment: false };
}

export function course(id: string, change: Partial<FreeCourse> = {}): FreeCourse {
  return {
    id,
    title: `Course ${id}`,
    stage: 'understand',
    kind: 'free',
    hours: null,
    url: `https://example.org/${id}`,
    booking: booking('2026-11-11', '2026-11-17'),
    progress: 0,
    enrolment: null,
    price: null,
    payment: null,
    paidOn: null,
    ...change,
  };
}

export function paid(id: string, change: Partial<PaidCourse> = {}): PaidCourse {
  return {
    ...course(id),
    kind: 'paid',
    hours: 2,
    url: null,
    progress: 0,
    enrolment: 'none',
    price: { currency: 'USD', minorUnits: 1900 },
    payment: 'due',
    paidOn: null,
    ...change,
  };
}

export const PLAN: StudyPlan = {
  startsOn: '2026-11-11',
  hoursPerWeek: 4,
  leftOut: [],
  notBefore: {},
  bookedDays: {},
};

export function timeline(change: Partial<StudyTimeline> = {}): StudyTimeline {
  return {
    region: 'us',
    isco08: '4313',
    plan: PLAN,
    saved: false,
    stages: [
      {
        stage: 'understand',
        courses: [course('a'), course('b', { booking: booking('2026-11-18', '2026-11-24', true) })],
      },
      {
        stage: 'apply',
        courses: [
          course('c', { booking: null }),
          paid('d', {
            stage: 'apply',
            progress: 0.5,
            enrolment: 'active',
            booking: booking('2026-11-25', '2026-11-28'),
          }),
        ],
      },
    ],
    finishesOn: '2026-11-28',
    knownHours: 2,
    defaultBookedDays: 7,
    ...change,
  };
}

/** The English words of the tests. */
export const words = {
  language: 'en' as const,
  t: (key: MessageKey, values?: MessageValues) => translate('en', key, values),
};

/** The names the chart gives its rows, in English. */
export const chartNames: ChartNames = {
  stage: (stage) => words.t(`stage.${stage}`),
  payment: (course) => paymentName(words, course),
  finish: words.t('timeline.finish'),
};
