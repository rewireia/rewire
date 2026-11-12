import type { Region, StudyPlan, StudyTimeline } from '@rewire/contracts';

import type { Clock } from '../../platform/clock.ts';
import type { OrderStore } from '../checkout/order-store.ts';
import type { LearningService } from '../learning/learning-service.ts';
import type { PathwayService } from '../pathway/pathway-service.ts';

import { dayOf, readerDay } from './calendar-day.ts';
import { coursePayments } from './course-payments.ts';
import { checkPlan, currentPlan } from './plan-rules.ts';
import type { StudyPlanStore } from './study-plan-store.ts';
import { buildTimeline, progressByCourse, type LearnerRecord } from './timeline.ts';

/** Hours a week of the plan everyone starts with. */
const STARTING_HOURS_PER_WEEK = 4;

/** A visitor has opened no course and paid for none. */
const NO_RECORD: LearnerRecord = {
  progressOf: progressByCourse([]),
  paymentOf: coursePayments([]),
};

export interface StudyPlanDependencies {
  readonly pathways: Pick<PathwayService, 'pathwayFor'>;
  readonly learning: Pick<LearningService, 'listEnrolments'>;
  readonly orders: Pick<OrderStore, 'listByLearner'>;
  readonly plans: StudyPlanStore;
  readonly clock: Clock;
}

/** The plan of an occupation in a region, on the reader's own day. */
interface PlanInView {
  readonly region: Region;
  readonly isco08: string;
  /** The day it is where the reader is, as their browser says. */
  readonly today?: string | undefined;
}

/** Whose plan is read, and for which occupation. */
interface TimelineRequest extends PlanInView {
  /** The learner reading it, or `undefined` for a visitor. */
  readonly learnerId: string | undefined;
}

/** The learning plan of an occupation in time, at the pace each learner sets. */
export interface StudyPlanService {
  /**
   * The plan in time, as a learner or a visitor sees it. A visitor, like a learner who has
   * saved nothing, gets the plan everyone starts with, from their own today. `undefined`
   * when the occupation has no learning plan.
   */
  timelineFor(request: TimelineRequest): Promise<StudyTimeline | undefined>;
  /**
   * Keeps a plan and answers with the timeline it gives. The learner is asked for through a
   * function, so a visitor becomes one only once the plan is known to be worth keeping.
   */
  save(
    view: PlanInView,
    plan: StudyPlan,
    ensureLearner: () => Promise<string>,
  ): Promise<StudyTimeline | undefined>;
}

export function createStudyPlanService(dependencies: StudyPlanDependencies): StudyPlanService {
  const { pathways, learning, orders, plans, clock } = dependencies;

  const startingPlan = (today: string): StudyPlan => ({
    startsOn: today,
    hoursPerWeek: STARTING_HOURS_PER_WEEK,
    leftOut: [],
    notBefore: {},
    bookedDays: {},
  });

  /** The learner's plan, if they saved one, the courses they added, and their progress. */
  const readLearner = async (learnerId: string, region: Region) => {
    const [saved, chosen, { enrolments }, learnerOrders] = await Promise.all([
      plans.find(learnerId),
      plans.chosen(learnerId, region),
      learning.listEnrolments(learnerId),
      orders.listByLearner(learnerId),
    ]);
    const record: LearnerRecord = {
      progressOf: progressByCourse(enrolments),
      paymentOf: coursePayments(learnerOrders),
    };
    return { saved, chosen, record };
  };

  const timelineFor: StudyPlanService['timelineFor'] = async (request) => {
    const { region, isco08, learnerId } = request;
    const pathway = await pathways.pathwayFor(region, isco08, learnerId);
    if (pathway === undefined) {
      return undefined;
    }
    const today = readerDay(dayOf(clock()), request.today);
    const { saved, chosen, record } =
      learnerId === undefined
        ? { saved: undefined, chosen: [], record: NO_RECORD }
        : await readLearner(learnerId, region);
    return buildTimeline({
      pathway,
      chosen,
      plan: saved === undefined ? startingPlan(today) : currentPlan(saved),
      saved: saved !== undefined,
      today,
      learner: record,
    });
  };

  return {
    timelineFor,

    async save(view, plan, ensureLearner) {
      checkPlan(plan);
      // Asked as a visitor: whether the occupation has a plan does not depend on the learner.
      const pathway = await pathways.pathwayFor(view.region, view.isco08, undefined);
      if (pathway === undefined) {
        return undefined;
      }
      const learnerId = await ensureLearner();
      await plans.save(learnerId, plan);
      return timelineFor({ ...view, learnerId });
    },
  };
}
