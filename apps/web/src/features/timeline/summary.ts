import type { StudyTimeline } from '@rewire/contracts';

import type { Language } from '../../app/preferences.ts';
import type { MessageKey } from '../../i18n/en.ts';
import { formatDate, type MessageValues } from '../../i18n/format.ts';

import { isWaiting } from './payment.ts';

type Translate = (key: MessageKey, values?: MessageValues) => string;

export interface PlanSummary {
  /** "At 4 hours a week you finish on 14 January 2027." */
  readonly headline: string;
  /** The published hours, and the courses Rewire gives a length to. */
  readonly details: readonly string[];
}

/** Courses in the plan whose provider publishes no length and the learner has not booked. */
function unbookedCourses(timeline: StudyTimeline): number {
  return timeline.stages
    .flatMap((stage) => stage.courses)
    .filter(
      (course) =>
        course.booking !== null &&
        course.hours === null &&
        timeline.plan.bookedDays[course.id] === undefined,
    ).length;
}

function lengthOf(days: number, t: Translate): string {
  return days === 7 ? t('timeline.length.week') : t('timeline.length.days', { days });
}

function unbookedSentence(timeline: StudyTimeline, t: Translate): string | null {
  const count = unbookedCourses(timeline);
  if (count === 0) {
    return null;
  }
  const length = lengthOf(timeline.defaultBookedDays, t);
  return count === 1
    ? t('timeline.unbooked.one', { length })
    : t('timeline.unbooked.other', { count, length });
}

/** How many courses wait for their payment, and what that does to the plan. */
function heldSentence(timeline: StudyTimeline, t: Translate): string | null {
  const count = timeline.stages.flatMap((stage) => stage.courses).filter(isWaiting).length;
  if (count === 0) {
    return null;
  }
  return count === 1 ? t('timeline.summary.held.one') : t('timeline.summary.held.other', { count });
}

/** The sentence that says when the plan ends, and what that date is made of. */
export function planSummary(
  timeline: StudyTimeline,
  t: Translate,
  language: Language,
): PlanSummary {
  const { finishesOn, plan, knownHours } = timeline;
  if (finishesOn === null) {
    return { headline: t('timeline.summary.empty'), details: [] };
  }
  const headline = t('timeline.summary.finishes', {
    hours: plan.hoursPerWeek,
    date: formatDate(finishesOn, language),
  });
  const unbooked = unbookedSentence(timeline, t);
  const details = [
    knownHours > 0 ? t('timeline.summary.known', { hours: knownHours }) : null,
    unbooked,
    heldSentence(timeline, t),
  ].filter((sentence) => sentence !== null);
  return { headline, details };
}
