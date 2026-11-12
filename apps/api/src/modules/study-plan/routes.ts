import { studyPlanQuerySchema, studyPlanSchema, type StudyTimeline } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { notFound } from '../../http/problem.ts';
import { parseBody, parseInput, regionOf } from '../../http/validate.ts';
import type { Sessions } from '../learners/session.ts';

import type { StudyPlanService } from './study-plan-service.ts';

export interface StudyPlanRouteDependencies {
  readonly studyPlans: StudyPlanService;
  readonly sessions: Sessions;
}

/** The learning plan of an occupation in time, and the pace a learner sets for it. */
export function studyPlanRoutes({
  studyPlans,
  sessions,
}: StudyPlanRouteDependencies): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/regions/:region/study-plan', async (context) => {
      const region = regionOf(context);
      const { isco08, today } = parseInput(studyPlanQuerySchema, context.req.query());
      const learnerId = context.get('learnerId');
      return context.json(
        scored(await studyPlans.timelineFor({ region, isco08, learnerId, today })),
      );
    })
    .put('/regions/:region/study-plan', async (context) => {
      const region = regionOf(context);
      const { isco08, today } = parseInput(studyPlanQuerySchema, context.req.query());
      const plan = await parseBody(context, studyPlanSchema);
      const timeline = await studyPlans.save({ region, isco08, today }, plan, () =>
        sessions.ensureLearner(context),
      );
      return context.json(scored(timeline));
    });
}

/** A plan exists only for an occupation the ILO has scored. */
function scored(timeline: StudyTimeline | undefined): StudyTimeline {
  if (timeline === undefined) {
    throw notFound('A scored occupation with that code');
  }
  return timeline;
}
