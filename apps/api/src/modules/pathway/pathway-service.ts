import { DEMO_COURSES, REGION_PROFILES } from '@rewire/content';
import type { CourseCard, EnrolmentStatus, Pathway, Region } from '@rewire/contracts';
import type { Engine } from '@rewire/engine';

import type { Marketplace } from '../marketplace/service.ts';
import type { OrderStore } from '../checkout/order-store.ts';
import { tasksTheyDo } from '../exposure/task-focus.ts';
import type { LearnerStore } from '../learners/learner-store.ts';
import type { EnrolmentStore } from '../learning/enrolment-store.ts';

import { buildPathway, enrolmentStatuses, presentCourse } from './pathway.ts';

export interface PathwayDependencies {
  readonly marketplace?: Marketplace;
  readonly engine: Engine;
  readonly learners: LearnerStore;
  readonly enrolments: EnrolmentStore;
  readonly orders: Pick<OrderStore, 'listByLearner'>;
}

/** The learning plan of an occupation, with where a learner stands on each course. */
export interface PathwayService {
  /**
   * The plan for an occupation in a region, as a learner or a visitor sees it. `undefined`
   * when the ILO has no scores for the occupation.
   */
  pathwayFor(
    region: Region,
    isco08: string,
    learnerId: string | undefined,
  ): Promise<Pathway | undefined>;
  /** Every paid course of the catalogue as the region sells it, for any occupation. */
  coursesFor(region: Region, learnerId: string | undefined): Promise<CourseCard[]>;
}

export function createPathwayService(dependencies: PathwayDependencies): PathwayService {
  const { engine, learners, enrolments, orders } = dependencies;

  /** A visitor has no enrolment and no payment, so every course reads `none`. */
  const enrolmentOf = async (
    learnerId: string | undefined,
  ): Promise<(courseId: string) => EnrolmentStatus> => {
    if (learnerId === undefined) {
      return () => 'none';
    }
    const [learnerEnrolments, learnerOrders] = await Promise.all([
      enrolments.listByLearner(learnerId),
      orders.listByLearner(learnerId),
    ]);
    const pending = learnerOrders.filter((order) => order.status === 'pending');
    return enrolmentStatuses(learnerEnrolments, new Set(pending.map((order) => order.courseId)));
  };

  return {
    async pathwayFor(region, isco08, learnerId) {
      const exposure = engine.exposureProfile(isco08);
      if (exposure === undefined) {
        return undefined;
      }
      const learner = learnerId === undefined ? undefined : await learners.find(learnerId);
      const pathway = buildPathway({
        region: REGION_PROFILES[region],
        exposure,
        tasks: tasksTheyDo(exposure, learner?.profile),
        enrolmentOf: await enrolmentOf(learnerId),
      });
      if (!dependencies.marketplace) return pathway;
      const terms = await dependencies.marketplace.catalogue(region);
      return {
        ...pathway,
        steps: pathway.steps.map((step) => ({
          ...step,
          courses: updateCourses(step.courses, terms),
        })),
      };
    },

    async coursesFor(region, learnerId) {
      const standing = await enrolmentOf(learnerId);
      const courses = DEMO_COURSES.map((course) =>
        presentCourse(course, REGION_PROFILES[region], standing(course.id)),
      );
      return dependencies.marketplace
        ? updateCourses(courses, await dependencies.marketplace.catalogue(region))
        : courses;
    },
  };
}

function updateCourses(
  courses: CourseCard[],
  terms: Awaited<ReturnType<Marketplace['catalogue']>>,
): CourseCard[] {
  return courses.flatMap((course) => {
    const term = terms.find((item) => item.courseId === course.id);
    if (!term?.published) return [];
    return [
      {
        ...course,
        price: { ...course.price, minorUnits: term.priceMinor },
        payLater: course.price.minorUnits === term.priceMinor ? course.payLater : [],
      },
    ];
  });
}
