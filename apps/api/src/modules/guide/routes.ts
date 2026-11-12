import {
  explanationRequestSchema,
  guideRequestSchema,
  interpretRequestSchema,
  type GuideStatus,
} from '@rewire/contracts';
import type { Engine } from '@rewire/engine';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { notFound } from '../../http/problem.ts';
import { parseBody, regionOf } from '../../http/validate.ts';
import type { Sessions } from '../learners/session.ts';

import type { GuideService } from './guide-service.ts';

export interface GuideRouteDependencies {
  readonly engine: Engine;
  readonly guide: GuideService;
  readonly sessions: Sessions;
  /** What the person is told about where their words go, before they write any. */
  readonly disclosure: Pick<GuideStatus, 'provider' | 'usedToImproveModels'>;
}

/** The AI guide: understanding a job description, explaining a report and conversing. */
export function guideRoutes({
  engine,
  guide,
  sessions,
  disclosure,
}: GuideRouteDependencies): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/guide/status', (context) => {
      const status: GuideStatus = { available: guide.available, ...disclosure };
      return context.json(status);
    })
    .post('/regions/:region/occupations/interpret', async (context) => {
      const region = regionOf(context);
      const request = await parseBody(context, interpretRequestSchema);
      return context.json(await guide.interpret(region, request.text, request.lang));
    })
    .post('/unit-groups/:isco08/explanation', async (context) => {
      const profile = engine.exposureProfile(context.req.param('isco08'));
      if (profile === undefined) {
        throw notFound('A scored occupation with that code');
      }
      const request = await parseBody(context, explanationRequestSchema);
      return context.json(await guide.explain(profile, request));
    })
    .post('/guide/messages', async (context) => {
      const request = await parseBody(context, guideRequestSchema);
      return context.json(
        await guide.converse(request, {
          learnerId: context.get('learnerId'),
          ensureLearner: () => sessions.ensureLearner(context),
        }),
      );
    });
}
