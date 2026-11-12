import type { Region } from '@rewire/data/schema';

import { DEMO_COURSES } from './courses/demo/index.ts';
import { FREE_COURSES } from './courses/free.ts';
import { HOSTED_COURSE_TOPICS } from './courses/hosted-topics.ts';
import { LISTED_COURSES } from './courses/listed/index.ts';
import { listedPrices } from './listed-price.ts';
import type { DemoCourse, FreeCourse, PathwayStage } from './schema/course.ts';
import type { CourseLevel, ListedCourse, TopicId } from './schema/listed-course.ts';
import type { Currency, Money } from './schema/money.ts';

/** Position of each stage in a learning plan. */
const STAGE_ORDER: Readonly<Record<PathwayStage, number>> = {
  understand: 0,
  apply: 1,
  strengthen: 2,
};

export function findDemoCourse(id: string): DemoCourse | undefined {
  return DEMO_COURSES.find((course) => course.id === id);
}

/** What selling a course needs to know of it, whether Rewire hosts it or lists it. */
export interface SellableCourse {
  readonly id: string;
  readonly title: string;
  readonly kind: 'hosted' | 'listed';
  readonly provider: string;
  /** The course on its provider's site; null for the courses Rewire hosts. */
  readonly url: string | null;
  readonly summary: string;
  /** The summary in Spanish, when there is one. */
  readonly summaryEs: string | null;
  readonly topics: readonly TopicId[];
  readonly level: CourseLevel;
  /** The step of a learning plan it fits: its own for a hosted course, by level for a listed one. */
  readonly stage: PathwayStage;
  readonly hours: number | null;
  readonly languages: readonly string[];
  readonly providerAccess: ListedCourse['providerAccess'];
  /** Regions it is sold in. Empty when it is sold in every region. */
  readonly regions: ListedCourse['regions'];
  readonly checkedOn: string;
  /** Sandbox price in the smallest unit of each currency. */
  readonly prices: Readonly<Record<Currency, number>>;
}

/** Name under which the courses Rewire wrote for the demonstration are sold. */
const HOSTED_PROVIDER = 'Rewire';

/** Day the demonstration courses were last reviewed. */
const HOSTED_CHECKED_ON = '2026-11-12';

function hostedSellable(course: DemoCourse): SellableCourse {
  return {
    id: course.id,
    title: course.title,
    kind: 'hosted',
    provider: HOSTED_PROVIDER,
    url: null,
    summary: course.summary,
    summaryEs: null,
    topics: HOSTED_COURSE_TOPICS[course.id] ?? [],
    level: course.level,
    stage: course.stage,
    hours: course.hours,
    languages: ['en'],
    providerAccess: 'paid',
    regions: [],
    checkedOn: HOSTED_CHECKED_ON,
    prices: course.prices,
  };
}

/**
 * The step of a learning plan a listed course fits, by the level its provider gives it: an
 * introductory course helps to understand, an intermediate one to apply, an advanced one to
 * strengthen what is already practised.
 */
const STAGE_OF_LEVEL: Readonly<Record<CourseLevel, PathwayStage>> = {
  introductory: 'understand',
  intermediate: 'apply',
  advanced: 'strengthen',
};

export function stageOfLevel(level: CourseLevel): PathwayStage {
  return STAGE_OF_LEVEL[level];
}

function listedSellable(course: ListedCourse): SellableCourse {
  return {
    ...course,
    kind: 'listed',
    stage: stageOfLevel(course.level),
    prices: listedPrices(course.hours),
  };
}

/**
 * Every course the marketplace can sell: the hosted ones first, then the listed ones. A
 * listed course never takes the id of a hosted one.
 */
export const SELLABLE_COURSES: readonly SellableCourse[] = [
  ...DEMO_COURSES.map(hostedSellable),
  ...LISTED_COURSES.filter((course) => findDemoCourse(course.id) === undefined).map(listedSellable),
];

const SELLABLE_BY_ID: ReadonlyMap<string, SellableCourse> = new Map(
  SELLABLE_COURSES.map((course) => [course.id, course]),
);

/**
 * The courses the demonstration seller published from its dashboard. They live in the server's
 * database: the server sets them here when it starts and after each change, so that every reader
 * of the catalogue finds them as it finds the others.
 */
let ownCourses: ReadonlyMap<string, SellableCourse> = new Map();

/** Replaces the courses the seller published; a content course keeps its id. */
export function setSellerCourses(courses: readonly SellableCourse[]): void {
  ownCourses = new Map(
    courses.filter((course) => !SELLABLE_BY_ID.has(course.id)).map((course) => [course.id, course]),
  );
}

/** Every course the marketplace can sell now: the content's, then the seller's own. */
export function sellableCourses(): readonly SellableCourse[] {
  return [...SELLABLE_COURSES, ...ownCourses.values()];
}

/** Any course the marketplace can sell, by its id. */
export function findSellableCourse(id: string): SellableCourse | undefined {
  return SELLABLE_BY_ID.get(id) ?? ownCourses.get(id);
}

/** The price of a course in one currency, as the server charges it. */
export function priceOf(course: DemoCourse, currency: Currency): Money {
  return { currency, minorUnits: course.prices[currency] };
}

/**
 * The demo courses for one ISCO-08 major group: those written for it and those that suit
 * every job, in the order of the learning plan.
 */
export function demoCoursesFor(majorGroup: string): readonly DemoCourse[] {
  return DEMO_COURSES.filter(
    (course) => course.majorGroups.length === 0 || course.majorGroups.includes(majorGroup),
  ).toSorted((first, second) => STAGE_ORDER[first.stage] - STAGE_ORDER[second.stage]);
}

/** The free courses a person in a region can take: those open to anyone and its own. */
export function freeCoursesFor(region: Region): readonly FreeCourse[] {
  return FREE_COURSES.filter(
    (course) => course.regions.length === 0 || course.regions.includes(region),
  );
}
