import {
  marketTermsSchema,
  roadmapInputSchema,
  courseSearchInputSchema,
  regionSchema,
} from '@rewire/contracts';
import { Hono } from 'hono';
import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, parseInput } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';
import type { SellerCourses } from '../seller-courses/seller-courses.ts';
import type { WalletService } from '../wallet/wallet-service.ts';
import type { Marketplace } from './service.ts';

export function marketplaceRoutes(
  marketplace: Marketplace,
  wallet: Pick<WalletService, 'standing'>,
  sellerCourses: Pick<SellerCourses, 'has' | 'setTerms'>,
): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/marketplace/roadmap', async (c) =>
      c.json(
        await marketplace.roadmap(
          requireDashboardAccess(c),
          parseInput(regionSchema, c.req.query('region')),
          c.req.query('language') ?? 'en',
        ),
      ),
    )
    .put('/marketplace/roadmap', async (c) => {
      const input = await parseBody(c, roadmapInputSchema);
      await marketplace.saveRoadmap(requireDashboardAccess(c), input.region, input.courseIds);
      return c.json({ saved: true });
    })
    .get('/marketplace/wallet', async (c) =>
      c.json(
        await wallet.standing(
          requireDashboardAccess(c),
          parseInput(regionSchema, c.req.query('region')),
        ),
      ),
    )
    .post('/marketplace/recommendations', async (c) =>
      c.json(
        await marketplace.recommendations(
          requireDashboardAccess(c),
          await parseBody(c, courseSearchInputSchema),
        ),
      ),
    )
    .route('/', businessRoutes(marketplace, sellerCourses));
}

/** The demonstration seller's catalogue, terms and sales, for the business role only. */
function businessRoutes(
  marketplace: Marketplace,
  sellerCourses: Pick<SellerCourses, 'has' | 'setTerms'>,
): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/business/catalogue', async (c) => {
      requireDashboardAccess(c, 'business');
      return c.json({
        courses: await marketplace.catalogue(parseInput(regionSchema, c.req.query('region'))),
      });
    })
    .put('/business/catalogue/:courseId', async (c) => {
      requireDashboardAccess(c, 'business');
      const input = await parseBody(c, marketTermsSchema);
      if (input.courseId !== c.req.param('courseId'))
        return c.json({ error: 'Course mismatch' }, 400);
      const courses = await marketplace.catalogue(input.region);
      const course = courses.find((item) => item.courseId === input.courseId);
      if (!course) return c.json({ error: 'Course not found' }, 404);
      // A course the seller published keeps its terms with the rest of what it wrote.
      if (sellerCourses.has(input.courseId)) {
        await sellerCourses.setTerms(input.courseId, input.priceMinor, input.published);
        return c.json({ ...course, ...input, offer: null });
      }
      return c.json(await marketplace.setTerms({ ...course, ...input }));
    })
    .get('/business/sales', async (c) => {
      requireDashboardAccess(c, 'business');
      return c.json(await marketplace.sales());
    });
}
