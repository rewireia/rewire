import { regionSchema, sellerCourseInputSchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, parseInput } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';

import type { SellerCourses } from './seller-courses.ts';

/** The courses the seller publishes from its dashboard, for the business role only. */
export function sellerCourseRoutes(courses: SellerCourses): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/business/courses', (c) => {
      requireDashboardAccess(c, 'business');
      return c.json({ courses: courses.list(parseInput(regionSchema, c.req.query('region'))) });
    })
    .post('/business/courses', async (c) => {
      requireDashboardAccess(c, 'business');
      return c.json(await courses.create(await parseBody(c, sellerCourseInputSchema)), 201);
    })
    .put('/business/courses/:id', async (c) => {
      requireDashboardAccess(c, 'business');
      const input = await parseBody(c, sellerCourseInputSchema);
      return c.json(await courses.update(c.req.param('id'), input));
    });
}
