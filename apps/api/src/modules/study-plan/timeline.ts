import type {
  Booking,
  Enrolment,
  EnrolmentStatus,
  Money,
  PathwayStage,
  Pathway,
  PathwayStep,
  PlannedCourse,
  StudyPlan,
  StudyTimeline,
  TimelineStage,
} from '@rewire/contracts';

import { addDays, laterOf } from './calendar-day.ts';
import type { CoursePayment } from './course-payments.ts';

/** Days booked for a course of unpublished length until the learner says otherwise. */
const DEFAULT_BOOKED_DAYS = 7;
const DAYS_PER_WEEK = 7;

/** `Omit` that keeps the members of a union apart. */
type OmitFromEach<Union, Key extends PropertyKey> = Union extends unknown
  ? Omit<Union, Key>
  : never;

/** A course of the plan before it has its place in time. */
type UnbookedCourse = OmitFromEach<PlannedCourse, 'booking'>;

/** A course the learner added to their plan from the catalogue, in the step it fits. */
export interface ChosenCourse {
  readonly id: string;
  readonly title: string;
  readonly stage: PathwayStage;
  readonly hours: number | null;
  readonly price: Money;
  readonly enrolment: EnrolmentStatus;
}

export interface TimelineInput {
  readonly pathway: Pathway;
  /** Courses the learner added; one the plan already has is not added twice. */
  readonly chosen?: readonly ChosenCourse[];
  readonly plan: StudyPlan;
  /** Whether the plan is the learner's own or the one everyone starts with. */
  readonly saved: boolean;
  /** The day it is for the reader: an unpaid course cannot start before it. */
  readonly today: string;
  readonly learner: LearnerRecord;
}

/** What the server knows of the learner's dealings with each paid course. */
export interface LearnerRecord {
  /** Share of a course done, from 0 to 1; 0 for one the learner has not opened. */
  readonly progressOf: (courseId: string) => number;
  readonly paymentOf: (courseId: string) => CoursePayment;
}

/**
 * Lays a learning plan out in time. The courses follow one another in the order of the
 * plan, free ones first in each step. None starts before the one ahead of it ends, nor
 * before the day the learner moved it to, nor, when it is a paid one, before it is paid for.
 */
export function buildTimeline({
  pathway,
  chosen = [],
  plan,
  saved,
  today,
  learner,
}: TimelineInput): StudyTimeline {
  const leftOut = new Set(plan.leftOut);
  const inPathway = new Set(
    pathway.steps.flatMap((step) => [...step.freeCourses, ...step.courses].map(({ id }) => id)),
  );
  const added = chosen.filter((course) => !inPathway.has(course.id));
  const stages: TimelineStage[] = [];
  let nextFreeDay = plan.startsOn;
  for (const step of pathway.steps) {
    const courses: PlannedCourse[] = [];
    const addedHere = added.filter((course) => course.stage === step.stage);
    for (const course of [...coursesOf(step, learner), ...addedCourses(addedHere, learner)]) {
      const booking = leftOut.has(course.id) ? null : bookingOf(course, plan, nextFreeDay, today);
      nextFreeDay = booking === null ? nextFreeDay : addDays(booking.endsOn, 1);
      courses.push({ ...course, booking });
    }
    stages.push({ stage: step.stage, courses });
  }
  const booked = stages.flatMap((stage) => stage.courses).filter(({ booking }) => booking !== null);
  return {
    region: pathway.region,
    isco08: pathway.isco08,
    plan,
    saved,
    stages,
    finishesOn: booked.at(-1)?.booking?.endsOn ?? null,
    knownHours: totalHours(booked),
    defaultBookedDays: DEFAULT_BOOKED_DAYS,
  };
}

/**
 * Share of each course done, read from the learner's enrolments. Every lesson and the quiz
 * count as one step each, so a course with all its lessons read is not yet complete.
 */
export function progressByCourse(enrolments: readonly Enrolment[]): (courseId: string) => number {
  const progress = new Map(
    enrolments.map((line) => [
      line.courseId,
      // A listed course is taken at its provider: Rewire sees no lessons, only completion.
      line.status === 'completed'
        ? 1
        : line.kind === 'listed'
          ? 0
          : line.lessonsCompleted / (line.lessons + 1),
    ]),
  );
  return (courseId) => progress.get(courseId) ?? 0;
}

/** The courses of a step in the order a learner takes them: the free ones first. */
function coursesOf(step: PathwayStep, learner: LearnerRecord): UnbookedCourse[] {
  const free = step.freeCourses.map(({ id, title, hours, url }): UnbookedCourse => ({
    id,
    title,
    stage: step.stage,
    kind: 'free',
    hours,
    url,
    progress: 0,
    enrolment: null,
    price: null,
    payment: null,
    paidOn: null,
  }));
  const paid = step.courses.map(({ id, title, hours, enrolment, price }): UnbookedCourse => ({
    id,
    title,
    stage: step.stage,
    kind: 'paid',
    hours,
    url: null,
    progress: learner.progressOf(id),
    enrolment,
    price,
    ...learner.paymentOf(id),
  }));
  return [...free, ...paid];
}

/** The courses the learner added to a step, after the plan's own: paid, so they wait for it. */
function addedCourses(courses: readonly ChosenCourse[], learner: LearnerRecord): UnbookedCourse[] {
  return courses.map(({ id, title, stage, hours, price, enrolment }): UnbookedCourse => ({
    id,
    title,
    stage,
    kind: 'paid',
    hours,
    url: null,
    progress: learner.progressOf(id),
    enrolment,
    price,
    ...learner.paymentOf(id),
    addedByLearner: true,
  }));
}

function bookingOf(
  course: UnbookedCourse,
  plan: StudyPlan,
  nextFreeDay: string,
  today: string,
): Booking {
  const movedTo = plan.notBefore[course.id];
  const planned = movedTo === undefined ? nextFreeDay : laterOf(nextFreeDay, movedTo);
  const startsOn = laterOf(planned, paymentAllowsFrom(course, today) ?? planned);
  return {
    startsOn,
    endsOn: addDays(startsOn, daysFor(course, plan) - 1),
    moved: movedTo !== undefined,
    heldByPayment: startsOn > planned,
  };
}

/**
 * The first day a course may start as far as its payment goes. A paid course cannot start
 * before it is paid for: one already paid, not before that day; one still unpaid, not
 * before today, so it moves forward day by day until the payment arrives. A free course
 * waits for no payment.
 */
function paymentAllowsFrom(course: UnbookedCourse, today: string): string | undefined {
  if (course.kind === 'free') {
    return undefined;
  }
  return course.paidOn ?? today;
}

/**
 * The days a course takes: its hours at the learner's weekly pace, rounded up to whole
 * days, or the days the learner booked when its provider publishes no length.
 */
function daysFor(course: UnbookedCourse, plan: StudyPlan): number {
  if (course.hours === null) {
    return plan.bookedDays[course.id] ?? DEFAULT_BOOKED_DAYS;
  }
  return Math.max(1, Math.ceil((course.hours * DAYS_PER_WEEK) / plan.hoursPerWeek));
}

/** The published hours of some courses, to one decimal. */
function totalHours(courses: readonly PlannedCourse[]): number {
  const hours = courses.reduce((sum, course) => sum + (course.hours ?? 0), 0);
  return Math.round(hours * 10) / 10;
}
