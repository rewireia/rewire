import { DEMO_COURSES, FREE_COURSES } from '@rewire/content';
import type { Problem, StudyPlan } from '@rewire/contracts';

import { invalidInput } from '../../http/problem.ts';

type Issue = NonNullable<Problem['issues']>[number];

/** The published length of every course, free or paid, by id; `null` when it has none. */
const HOURS_BY_COURSE: ReadonlyMap<string, number | null> = new Map(
  [...FREE_COURSES, ...DEMO_COURSES].map((course) => [course.id, course.hours]),
);

/**
 * A plan is kept only if Rewire can stand behind it: every course it names is one of the
 * catalogue, and days are booked by hand only for a course whose provider publishes no
 * length. The length of every other course comes from its hours.
 */
export function checkPlan(plan: StudyPlan): void {
  const issues = [
    ...plan.leftOut.flatMap((courseId, index) => unknownCourse(courseId, `leftOut.${index}`)),
    ...Object.keys(plan.notBefore).flatMap((courseId) =>
      unknownCourse(courseId, `notBefore.${courseId}`),
    ),
    ...Object.keys(plan.bookedDays).flatMap(bookedDaysIssues),
  ];
  if (issues.length > 0) {
    throw invalidInput(issues);
  }
}

function unknownCourse(courseId: string, path: string): Issue[] {
  return HOURS_BY_COURSE.has(courseId) ? [] : [{ path, message: 'No course has that id.' }];
}

function bookedDaysIssues(courseId: string): Issue[] {
  const path = `bookedDays.${courseId}`;
  const hours = HOURS_BY_COURSE.get(courseId);
  if (hours === undefined) {
    return unknownCourse(courseId, path);
  }
  return hours === null
    ? []
    : [{ path, message: 'The length of this course comes from its published hours.' }];
}

/**
 * A saved plan as it holds today. The catalogue changes after a plan is saved: a course is
 * withdrawn, or its provider starts to publish its hours. What the plan says about such a
 * course is dropped, so that the plan a learner reads is always one they can save again.
 */
export function currentPlan(plan: StudyPlan): StudyPlan {
  const isCourse = (courseId: string): boolean => HOURS_BY_COURSE.has(courseId);
  const hasNoPublishedLength = (courseId: string): boolean =>
    HOURS_BY_COURSE.get(courseId) === null;
  return {
    ...plan,
    leftOut: plan.leftOut.filter(isCourse),
    notBefore: entriesFor(plan.notBefore, isCourse),
    bookedDays: entriesFor(plan.bookedDays, hasNoPublishedLength),
  };
}

function entriesFor<Value>(
  byCourse: Readonly<Record<string, Value>>,
  keep: (courseId: string) => boolean,
): Record<string, Value> {
  return Object.fromEntries(Object.entries(byCourse).filter(([courseId]) => keep(courseId)));
}
