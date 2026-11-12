import {
  studyTimelineSchema,
  type PlannedCourse,
  type StudyPlan,
  type StudyTimeline,
} from '@rewire/contracts';

import { bodyOf, type TestClient } from './client.ts';

/** The plan of a payroll clerk in the United States. */
export const PLAN_URL = '/api/regions/us/study-plan?isco08=4313';
/** The day of the test clock. */
export const TODAY = '2026-11-11';
/** A free course whose provider states its hours, one that states none, and a paid one. */
export const FREE_WITH_HOURS = 'ai-fluency-framework-foundations';
export const FREE_WITHOUT_HOURS = 'elements-of-ai-introduction';
export const PAID = 'ai-foundations';
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** The plan everyone starts with on the day of the test clock, with some changes. */
export const plan = (changes: Partial<StudyPlan> = {}): StudyPlan => ({
  startsOn: TODAY,
  hoursPerWeek: 4,
  leftOut: [],
  notBefore: {},
  bookedDays: {},
  ...changes,
});

export const readTimeline = async (client: TestClient): Promise<StudyTimeline> =>
  bodyOf(await client.get(PLAN_URL), 200, studyTimelineSchema);

export const savePlan = async (
  client: TestClient,
  changes: Partial<StudyPlan> = {},
): Promise<StudyTimeline> =>
  bodyOf(await client.put(PLAN_URL, plan(changes)), 200, studyTimelineSchema);

export const coursesOf = (timeline: StudyTimeline): PlannedCourse[] =>
  timeline.stages.flatMap((stage) => stage.courses);

export const courseOf = (timeline: StudyTimeline, courseId: string): PlannedCourse => {
  const course = coursesOf(timeline).find((candidate) => candidate.id === courseId);
  if (course === undefined) {
    throw new Error(`the plan has no ${courseId}`);
  }
  return course;
};

/** Whole days from the first day of a booking to its last, both included. */
export const daysOf = ({ booking }: PlannedCourse): number => {
  if (booking === null) {
    throw new Error('the course is left out');
  }
  return (Date.parse(booking.endsOn) - Date.parse(booking.startsOn)) / MILLISECONDS_PER_DAY + 1;
};
