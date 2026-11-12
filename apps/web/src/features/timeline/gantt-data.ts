import type {
  PathwayStage,
  PlannedCourse,
  Region,
  StudyTimeline,
  TimelineStage,
} from '@rewire/contracts';

import { addDays, chartEnd, toLocalDate } from './calendar.ts';
import { isWaiting, milestoneDay, type PaidCourse } from './payment.ts';

/** A row of the chart: a stage with its courses, one course, a payment or the end of the plan. */
interface PlanTask {
  readonly id: string;
  readonly name: string;
  /** Absent for a course left out of the plan, and for a stage with none in it. */
  readonly startDate?: Date;
  readonly endDate?: Date;
  /** Rewire's server places every course: the chart never moves one on its own. */
  readonly manuallyScheduled: true;
  readonly draggable: boolean;
  /** `'end'`: only the end of a course of unpublished length can be stretched. */
  readonly resizable: boolean | 'end';
  readonly inPlan: boolean;
  readonly cls: string;
  readonly expanded?: true;
  readonly children?: PlanTask[];
}

/** An arrow from one course to the next one in the plan. */
export interface PlanDependency {
  readonly id: string;
  readonly fromTask: string;
  readonly toTask: string;
}

/** Bryntum takes mutable arrays; each chart gets arrays of its own. */
export interface GanttData {
  readonly tasks: PlanTask[];
  readonly dependencies: PlanDependency[];
  /** The days the time axis shows: from the first course to a little after the last. */
  readonly startDate: Date;
  readonly endDate: Date;
  /** Every course, by the id of its row. */
  readonly courses: ReadonlyMap<string, PlannedCourse>;
  /** The paid course of each payment milestone, by the id of its row. */
  readonly payments: ReadonlyMap<string, PaidCourse>;
  /** How many courses of each stage in the plan are done, by the id of its row. */
  readonly stages: ReadonlyMap<string, { readonly done: number; readonly total: number }>;
}

/** The names the chart gives the rows it adds: stages, payments and the end of the plan. */
export interface ChartNames {
  readonly stage: (stage: PathwayStage) => string;
  readonly payment: (course: PaidCourse) => string;
  readonly finish: string;
}

/** The row of the last day of the plan. */
export const FINISH_ID = 'finish';

/** Room after the last course, to move or stretch it a little later. */
const DAYS_AFTER = 14;

const stageId = (stage: PathwayStage) => `stage-${stage}`;
/** The row of the payment of a paid course. */
export const paymentId = (courseId: string) => `pay-${courseId}`;

/** Whether a course is done, as far as Rewire can see. */
export function isCompleted(course: PlannedCourse): boolean {
  return course.enrolment === 'completed' || course.progress >= 1;
}

/** The classes of a course's bar: how it is run, whether it is done and whether it moved. */
function courseCls(course: PlannedCourse): string {
  return [
    `rewire-${course.kind}`,
    `rewire-stage-${course.stage}`,
    isCompleted(course) ? 'rewire-done' : '',
    course.booking?.moved === true ? 'rewire-moved' : '',
    isWaiting(course) ? 'rewire-held' : '',
  ]
    .filter((cls) => cls !== '')
    .join(' ');
}

function courseTask(course: PlannedCourse): PlanTask {
  const { booking } = course;
  const placed = booking !== null;
  return {
    id: course.id,
    name: course.title,
    ...(placed
      ? { startDate: toLocalDate(booking.startsOn), endDate: chartEnd(booking.endsOn) }
      : {}),
    manuallyScheduled: true,
    draggable: placed,
    resizable: placed && course.hours === null ? 'end' : false,
    inPlan: placed,
    cls: courseCls(course),
  };
}

/** A milestone on the day a paid course is paid for, or on the day it needs to be. */
function paymentTask(course: PaidCourse, name: string): PlanTask[] {
  const day = milestoneDay(course);
  if (day === null) {
    return [];
  }
  const date = toLocalDate(day);
  return [
    {
      id: paymentId(course.id),
      name,
      // A task with no length is drawn as a milestone.
      startDate: date,
      endDate: date,
      manuallyScheduled: true,
      draggable: false,
      resizable: false,
      inPlan: true,
      cls: `rewire-payment rewire-payment-${course.payment}`,
    },
  ];
}

/** A stage spans the courses of it that are in the plan; it is never moved by hand. */
function stageTask(stage: TimelineStage, names: ChartNames): PlanTask {
  const bookings = stage.courses.flatMap((course) => (course.booking === null ? [] : [course]));
  const first = bookings.at(0)?.booking;
  const last = bookings.at(-1)?.booking;
  return {
    id: stageId(stage.stage),
    name: names.stage(stage.stage),
    ...(first !== undefined && last !== undefined && first !== null && last !== null
      ? { startDate: toLocalDate(first.startsOn), endDate: chartEnd(last.endsOn) }
      : {}),
    manuallyScheduled: true,
    draggable: false,
    resizable: false,
    inPlan: bookings.length > 0,
    cls: `rewire-stage rewire-stage-${stage.stage}`,
    expanded: true,
    // Each paid course is preceded by its payment.
    children: stage.courses.flatMap((course) =>
      course.kind === 'paid'
        ? [...paymentTask(course, names.payment(course)), courseTask(course)]
        : [courseTask(course)],
    ),
  };
}

/** A milestone at the end of the last day of the plan. */
function finishTask(timeline: StudyTimeline, name: string): PlanTask[] {
  if (timeline.finishesOn === null) {
    return [];
  }
  const end = chartEnd(timeline.finishesOn);
  const finish = { id: FINISH_ID, name, startDate: end, endDate: end };
  const fixed = { manuallyScheduled: true, draggable: false, resizable: false } as const;
  return [{ ...finish, ...fixed, inPlan: true, cls: 'rewire-finish' }];
}

const arrow = (fromTask: string, toTask: string): PlanDependency => ({
  id: `${fromTask}>${toTask}`,
  fromTask,
  toTask,
});

/**
 * Arrows between each course in the plan and the next one, in the order of the plan; from each
 * payment to its course; and from the last course to the end of the plan.
 */
export function planDependencies(timeline: StudyTimeline): PlanDependency[] {
  const inPlan = timeline.stages
    .flatMap((stage) => stage.courses)
    .filter((course) => course.booking !== null);
  const sequence = inPlan
    .slice(1)
    .map((course, index) => arrow(inPlan[index]?.id ?? course.id, course.id));
  const payments = inPlan.flatMap((course) =>
    course.kind === 'paid' ? [arrow(paymentId(course.id), course.id)] : [],
  );
  const last = inPlan.at(-1);
  const finish = last === undefined ? [] : [arrow(last.id, FINISH_ID)];
  return [...sequence, ...payments, ...finish];
}

/** How many courses of each stage in the plan are done. */
function stageCounts(timeline: StudyTimeline): GanttData['stages'] {
  return new Map(
    timeline.stages.map(({ stage, courses }) => {
      const inPlan = courses.filter((course) => course.booking !== null);
      const done = inPlan.filter(isCompleted).length;
      return [stageId(stage), { done, total: inPlan.length }];
    }),
  );
}

/** The first and last days the chart shows. */
function axisRange(timeline: StudyTimeline): { startDate: Date; endDate: Date } {
  const firstBooked = timeline.stages
    .flatMap((stage) => stage.courses)
    .flatMap((course) => [
      ...(course.booking === null ? [] : [course.booking.startsOn]),
      // A payment made before the plan began stands on its own day.
      ...(course.kind === 'paid' ? [milestoneDay(course) ?? course.booking?.startsOn] : []),
    ])
    .filter((day) => day !== undefined)
    .reduce((earliest, day) => (day < earliest ? day : earliest), timeline.plan.startsOn);
  const last = timeline.finishesOn ?? timeline.plan.startsOn;
  return {
    // The chart starts its axis at the beginning of the week of this day.
    startDate: toLocalDate(firstBooked),
    endDate: toLocalDate(addDays(last, DAYS_AFTER)),
  };
}

/** The plan Rewire's server laid out, as the rows, arrows and axis of the chart. */
export function toGanttData(timeline: StudyTimeline, names: ChartNames): GanttData {
  const all = timeline.stages.flatMap((stage) => stage.courses);
  const paid = all.filter((course) => course.kind === 'paid');
  return {
    tasks: [
      ...timeline.stages.map((stage) => stageTask(stage, names)),
      ...finishTask(timeline, names.finish),
    ],
    dependencies: planDependencies(timeline),
    ...axisRange(timeline),
    courses: new Map(all.map((course) => [course.id, course])),
    payments: new Map(paid.map((course) => [paymentId(course.id), course])),
    stages: stageCounts(timeline),
  };
}

/** Where the title of a course leads: its page in Rewire, or its provider's site. */
export function courseHref(region: Region, course: PlannedCourse): string {
  return course.kind === 'paid'
    ? `/${region}/courses/${encodeURIComponent(course.id)}`
    : course.url;
}
