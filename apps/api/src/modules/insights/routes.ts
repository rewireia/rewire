import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { regionOf } from '../../http/validate.ts';

import type { InsightsService } from './service.ts';

/** The data story of a region: what its labour statistics say when read through the ILO index. */
export function insightRoutes(insights: InsightsService): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>().get('/regions/:region/insights', (context) =>
    context.json(insights.insightsOf(regionOf(context))),
  );
}
