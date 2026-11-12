import { discountBeaconInputSchema, regionSchema, type ActiveOffer } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, parseInput } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';
import type { Marketplace } from '../marketplace/service.ts';

import type { Beacons } from './beacons.ts';

/**
 * The seller's discount beacons, for the business role, and the offer running in a region, for
 * anyone: its percentage, its end and how many published courses it takes off.
 */
export function offerRoutes(
  beacons: Beacons,
  marketplace: Pick<Marketplace, 'catalogue'>,
): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/business/beacons', async (c) => {
      requireDashboardAccess(c, 'business');
      const region = parseInput(regionSchema, c.req.query('region'));
      return c.json({ beacons: await beacons.list(region) });
    })
    .post('/business/beacons', async (c) => {
      requireDashboardAccess(c, 'business');
      return c.json(await beacons.create(await parseBody(c, discountBeaconInputSchema)), 201);
    })
    .post('/business/beacons/:id/cancel', async (c) => {
      requireDashboardAccess(c, 'business');
      return c.json(await beacons.cancel(c.req.param('id')));
    })
    .get('/regions/:region/offer', async (c) => {
      const region = parseInput(regionSchema, c.req.param('region'));
      const beacon = await beacons.active(region);
      const courses = beacon
        ? (await marketplace.catalogue(region)).filter((course) => course.published).length
        : 0;
      const answer: ActiveOffer = {
        offer: beacon ? { region, percent: beacon.percent, endsAt: beacon.endsAt, courses } : null,
      };
      return c.json(answer);
    });
}
