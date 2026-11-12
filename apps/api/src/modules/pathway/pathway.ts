import {
  demoCoursesFor,
  freeCoursesFor,
  priceOf,
  type DemoCourse,
  type FreeCourse,
  type Money,
  type PayLaterOffer,
  type RegionProfile,
} from '@rewire/content';
import type {
  CourseCard,
  EnrolmentStatus,
  FreeCourse as FreeCourseCard,
  Pathway,
  PathwayStage,
} from '@rewire/contracts';
import type { ExposureProfile, ProfiledTask } from '@rewire/engine';

import { leastExposed, mostExposed } from '../exposure/task-focus.ts';

/** The steps of every plan, in the order a person takes them. */
const STAGES: readonly PathwayStage[] = ['understand', 'apply', 'strengthen'];

export interface PathwayInput {
  readonly region: RegionProfile;
  readonly exposure: ExposureProfile;
  /** The tasks of the occupation the learner does, most exposed first. */
  readonly tasks: readonly ProfiledTask[];
  /** Where the learner stands with each paid course. */
  readonly enrolmentOf: (courseId: string) => EnrolmentStatus;
}

/**
 * The learning plan for one occupation in one region. In every step the free courses come
 * first, then the paid courses written for the occupation's major group or for any job.
 */
export function buildPathway({ region, exposure, tasks, enrolmentOf }: PathwayInput): Pathway {
  const free = freeCoursesFor(region.region);
  const paid = demoCoursesFor(exposure.majorGroup.code);
  return {
    region: region.region,
    isco08: exposure.isco08,
    occupationTitle: exposure.title,
    focus: { mostExposed: mostExposed(tasks), leastExposed: leastExposed(tasks) },
    steps: STAGES.map((stage) => ({
      stage,
      freeCourses: free.filter((course) => course.stage === stage).map(presentFreeCourse),
      courses: paid
        .filter((course) => course.stage === stage)
        .map((course) => presentCourse(course, region, enrolmentOf(course.id))),
    })),
  };
}

/**
 * The pay-later products PayPal documents for an amount: those of the same currency whose
 * range holds it. Whether the buyer qualifies is for PayPal to say.
 */
function payLaterFor(offers: readonly PayLaterOffer[], price: Money): CourseCard['payLater'] {
  return offers
    .filter(
      ({ minimum, maximum }) =>
        minimum.currency === price.currency &&
        maximum.currency === price.currency &&
        minimum.minorUnits <= price.minorUnits &&
        price.minorUnits <= maximum.minorUnits,
    )
    .map(({ country, product }) => ({ country, product }));
}

/**
 * Where a learner stands with each course. Access, active or completed, wins over a
 * payment PayPal still holds; a revoked enrolment counts as none.
 */
export function enrolmentStatuses(
  enrolments: readonly { readonly courseId: string; readonly status: string }[],
  pendingCourseIds: ReadonlySet<string>,
): (courseId: string) => EnrolmentStatus {
  const access = new Map<string, EnrolmentStatus>();
  for (const { courseId, status } of enrolments) {
    if (status === 'active' || status === 'completed') {
      access.set(courseId, status);
    }
  }
  return (courseId) =>
    access.get(courseId) ?? (pendingCourseIds.has(courseId) ? 'payment-pending' : 'none');
}

/** A paid course as a region sells it: priced in its currency, with the learner's standing. */
export function presentCourse(
  course: DemoCourse,
  region: RegionProfile,
  enrolment: EnrolmentStatus,
): CourseCard {
  const price = priceOf(course, region.currency);
  return {
    id: course.id,
    title: course.title,
    summary: course.summary,
    stage: course.stage,
    level: course.level,
    hours: course.hours,
    outcomes: [...course.outcomes],
    lessons: course.lessons.length,
    price,
    payLater: payLaterFor(region.payLater, price),
    demo: true,
    enrolment,
  };
}

function presentFreeCourse(course: FreeCourse): FreeCourseCard {
  return {
    id: course.id,
    title: course.title,
    provider: course.provider,
    url: course.url,
    summary: course.summary,
    languages: [...course.languages],
    hours: course.hours,
    checkedOn: course.checkedOn,
  };
}
