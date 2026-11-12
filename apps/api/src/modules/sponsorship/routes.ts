import { sponsorshipRequestSchema, type SponsorshipList } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';
import { requireLearner } from '../learners/current-learner.ts';
import type { Sessions } from '../learners/session.ts';

import type { SponsorshipService } from './sponsorship-service.ts';

export interface SponsorshipRouteDependencies {
  readonly sponsorship: SponsorshipService;
  readonly sessions: Sessions;
}

/** Asking an employer to pay for a course with a PayPal invoice. */
export function sponsorshipRoutes({
  sponsorship,
  sessions,
}: SponsorshipRouteDependencies): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .post('/sponsorships', async (context) => {
      const request = await parseBody(context, sponsorshipRequestSchema);
      const learnerId = await sessions.ensureLearner(context);
      return context.json(await sponsorship.request(learnerId, request), 201);
    })
    .get('/sponsorships', async (context) => {
      const learnerId = requireDashboardAccess(context);
      const list: SponsorshipList = {
        sponsorships: await sponsorship.list(learnerId),
      };
      return context.json(list);
    })
    .post('/sponsorships/:id/refresh', async (context) =>
      context.json(await sponsorship.refresh(requireLearner(context), context.req.param('id'))),
    )
    .post('/sponsorships/:id/cancel', async (context) =>
      context.json(await sponsorship.cancel(requireLearner(context), context.req.param('id'))),
    );
}
