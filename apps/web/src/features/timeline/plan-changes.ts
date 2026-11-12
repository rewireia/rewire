import type { StudyPlan } from '@rewire/contracts';

import { daysTaken, lastDayOf, toDay } from './calendar.ts';

/** The days a learner may book for a course whose provider publishes no length. */
export const BOOKED_DAYS = { min: 1, max: 180 } as const;

/** The days a plan may name, as the contract bounds them. */
export const PLAN_DAYS = { first: '2020-01-01', last: '2100-12-31' } as const;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a day typed by hand is whole and one a plan may name. */
export function isPlanDay(day: string): boolean {
  return DAY_PATTERN.test(day) && day >= PLAN_DAYS.first && day <= PLAN_DAYS.last;
}

/** Whether a number of days typed by hand may be booked for a course. */
export function isBookable(days: number): boolean {
  return Number.isInteger(days) && days >= BOOKED_DAYS.min && days <= BOOKED_DAYS.max;
}

/** Hours a week the learner picks from. */
const PACE_OPTIONS = [2, 4, 6, 8, 10] as const;

/** The paces offered, with the learner's own one when it is not among them. */
export function paceOptions(current: number): number[] {
  return [...new Set([...PACE_OPTIONS, current])].sort((a, b) => a - b);
}

export function withPace(plan: StudyPlan, hoursPerWeek: number): StudyPlan {
  return { ...plan, hoursPerWeek };
}

export function withStart(plan: StudyPlan, startsOn: string): StudyPlan {
  return { ...plan, startsOn };
}

/** The day before which a course may not start; `null` lets it follow the one before it. */
export function withNotBefore(plan: StudyPlan, courseId: string, day: string | null): StudyPlan {
  const notBefore = Object.fromEntries(
    Object.entries(plan.notBefore).filter(([id]) => id !== courseId),
  );
  return { ...plan, notBefore: day === null ? notBefore : { ...notBefore, [courseId]: day } };
}

/** The days booked for a course whose provider publishes no length, within bounds. */
export function withBookedDays(plan: StudyPlan, courseId: string, days: number): StudyPlan {
  const booked = Math.min(BOOKED_DAYS.max, Math.max(BOOKED_DAYS.min, Math.round(days)));
  return { ...plan, bookedDays: { ...plan.bookedDays, [courseId]: booked } };
}

/** A course dropped on a day of the chart: it does not start before it. */
export function movedTo(plan: StudyPlan, courseId: string, start: Date): StudyPlan {
  return withNotBefore(plan, courseId, toDay(start));
}

/** A course stretched to end at a moment of the chart: the days from its first one to it. */
export function stretchedTo(plan: StudyPlan, courseId: string, start: Date, end: Date): StudyPlan {
  return withBookedDays(plan, courseId, daysTaken(toDay(start), lastDayOf(end)));
}

/** A course put in the plan or left out of it. */
export function withCourse(plan: StudyPlan, courseId: string, inPlan: boolean): StudyPlan {
  const others = plan.leftOut.filter((id) => id !== courseId);
  return { ...plan, leftOut: inPlan ? others : [...others, courseId] };
}

/** Whether the learner changed anything that "Reset" undoes. */
export function hasChanges(plan: StudyPlan): boolean {
  return (
    plan.leftOut.length > 0 ||
    Object.keys(plan.notBefore).length > 0 ||
    Object.keys(plan.bookedDays).length > 0
  );
}

/** Every course back in its place and length; the start and the pace are kept. */
export function reset(plan: StudyPlan): StudyPlan {
  return { ...plan, leftOut: [], notBefore: {}, bookedDays: {} };
}
