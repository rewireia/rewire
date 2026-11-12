import type { Enrolment, RoadmapCourse } from '@rewire/contracts';

/** The four stages of the way through Rewire, each with its own colour on the path. */
type PathStage = 'understand' | 'plan' | 'learn' | 'achieve';

/**
 * Where a milestone stands: reached, the next one to take, still ahead, or a course whose
 * payment went back.
 */
type MilestoneState = 'done' | 'next' | 'later' | 'refunded';

interface MilestoneBase {
  readonly id: string;
  readonly stage: PathStage;
  readonly state: MilestoneState;
  /** The day it is planned for, `YYYY-MM-DD`; `null` for a step without a date. */
  readonly date: string | null;
}

/** A step of the way: the report, the plan, a course of the plan, the courses still to choose. */
export type Milestone =
  | (MilestoneBase & { readonly kind: 'report' | 'plan' | 'courses' })
  | (MilestoneBase & {
      readonly kind: 'course';
      readonly course: RoadmapCourse;
      /** The certificate earned with the course, once it is claimed. */
      readonly certificateId: string | null;
    })
  | (MilestoneBase & {
      readonly kind: 'goal';
      /** The last certificate earned, shown when the whole plan is done. */
      readonly certificateId: string | null;
    });

export interface LearningPath {
  readonly milestones: readonly Milestone[];
  /** The milestone "today" stands before; the length of the list when every one is behind. */
  readonly todayAt: number;
}

interface PathInput {
  readonly hasOccupation: boolean;
  /** The courses of the roadmap, as the server orders them. */
  readonly courses: readonly RoadmapCourse[];
  readonly enrolments: readonly Enrolment[];
  /** Today, `YYYY-MM-DD`. */
  readonly today: string;
}

const COURSE_STATE: Record<RoadmapCourse['status'], MilestoneState> = {
  completed: 'done',
  active: 'later',
  selected: 'later',
  revoked: 'refunded',
};

/**
 * The learner's way from their report to the goal, read only from their profile, roadmap and
 * enrolments. Without a plan, the courses are one step still to take: no course and no date is
 * made up for them.
 */
export function learningPath({
  hasOccupation,
  courses,
  enrolments,
  today,
}: PathInput): LearningPath {
  const certificates = new Map(enrolments.map((row) => [row.courseId, row.certificateId]));
  const planned = [...courses].sort((left, right) => left.date.localeCompare(right.date));
  const kept = planned.filter((course) => course.status !== 'revoked');
  const finished = kept.length > 0 && kept.every((course) => course.status === 'completed');
  const steps: Milestone[] = [
    { ...base('report', 'understand', hasOccupation), kind: 'report' },
    { ...base('plan', 'plan', kept.length > 0), kind: 'plan' },
    ...(planned.length === 0
      ? [{ ...base('courses', 'learn', false), kind: 'courses' as const }]
      : planned.map((course) => courseStep(course, certificates.get(course.courseId) ?? null))),
    {
      ...base('goal', 'achieve', finished),
      kind: 'goal',
      certificateId: finished ? lastCertificate(kept, certificates) : null,
    },
  ];
  const milestones = markNext(steps);
  return { milestones, todayAt: todayIndex(milestones, today) };
}

function base(id: string, stage: PathStage, done: boolean): MilestoneBase {
  return { id, stage, state: done ? 'done' : 'later', date: null };
}

function courseStep(course: RoadmapCourse, certificateId: string | null): Milestone {
  return {
    id: `course-${course.courseId}`,
    kind: 'course',
    stage: 'learn',
    state: COURSE_STATE[course.status],
    date: course.date,
    course,
    certificateId,
  };
}

function lastCertificate(
  courses: readonly RoadmapCourse[],
  certificates: ReadonlyMap<string, string | null>,
): string | null {
  return (
    courses
      .map((course) => certificates.get(course.courseId) ?? null)
      .filter((id) => id !== null)
      .at(-1) ?? null
  );
}

/** The first milestone neither reached nor refunded is the next one to take. */
function markNext(steps: readonly Milestone[]): readonly Milestone[] {
  const next = steps.findIndex((milestone) => milestone.state === 'later');
  return steps.map((milestone, index) =>
    index === next ? { ...milestone, state: 'next' } : milestone,
  );
}

/** Today stands before the first milestone not yet reached whose day has not come. */
function todayIndex(milestones: readonly Milestone[], today: string): number {
  const found = milestones.findIndex(
    (milestone) =>
      milestone.state !== 'done' &&
      milestone.state !== 'refunded' &&
      (milestone.date === null || milestone.date > today),
  );
  return found === -1 ? milestones.length : found;
}
