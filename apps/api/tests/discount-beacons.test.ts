import {
  activeOfferSchema,
  captureResultSchema,
  courseCatalogueSchema,
  discountBeaconListSchema,
  discountBeaconSchema,
  marketCatalogueSchema,
  marketSalesSchema,
  paymentListSchema,
  startedOrderSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  createTestApi,
  expectProblem,
  signInDemo,
  START,
  type TestApi,
} from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (offset: number) => new Date(START.getTime() + offset).toISOString();

let api: TestApi;
let learner: TestClient;
let business: TestClient;

/** The server's clock and the time of day, moved together; a dashboard session is signed again. */
async function advanceDays(days: number) {
  api.clock.advanceDays(days);
  vi.setSystemTime(api.clock());
  await signInDemo(learner);
  await signInDemo(business, 'business');
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
  api = await createTestApi({ overrides: { model: null } });
  learner = api.client();
  business = api.client();
  await signInDemo(learner);
  await signInDemo(business, 'business');
});
afterEach(async () => {
  await api.close();
  vi.useRealTimers();
});

const beacon = (percent: number, startsAt: string, endsAt: string) =>
  business.post('/api/business/beacons', { region: 'us', percent, startsAt, endsAt });

const shopPrice = async (courseId: string) => {
  const shop = await bodyOf(
    await learner.get('/api/regions/us/courses'),
    200,
    courseCatalogueSchema,
  );
  const card = shop.courses.find((course) => course.id === courseId);
  return { price: card?.price.minorUnits, offer: card?.offer ?? null };
};

/** Two published courses of the catalogue, with their list prices. */
async function twoCourses() {
  const catalogue = await bodyOf(
    await business.get('/api/business/catalogue?region=us'),
    200,
    marketCatalogueSchema,
  );
  const [first, second] = catalogue.courses.filter((course) => course.kind === 'hosted');
  if (!first || !second) throw new Error('The catalogue lacks hosted courses');
  return [first, second] as const;
}

const less = (minor: number, percent: number) => Math.round((minor * (100 - percent)) / 100);

describe('a discount beacon', () => {
  it('discounts every published course only between its two instants', async () => {
    const [course] = await twoCourses();
    const created = await bodyOf(
      await beacon(25, at(DAY), at(DAY + 2 * HOUR)),
      201,
      discountBeaconSchema,
    );
    expect(created.status).toBe('scheduled');
    expect(await shopPrice(course.courseId)).toEqual({ price: course.priceMinor, offer: null });
    expect(
      await bodyOf(await learner.get('/api/regions/us/offer'), 200, activeOfferSchema),
    ).toEqual({ offer: null });

    await advanceDays(1);
    expect(await shopPrice(course.courseId)).toEqual({
      price: less(course.priceMinor, 25),
      offer: {
        percent: 25,
        listPrice: { currency: 'USD', minorUnits: course.priceMinor },
        endsAt: at(DAY + 2 * HOUR),
      },
    });
    const offer = await bodyOf(await learner.get('/api/regions/us/offer'), 200, activeOfferSchema);
    expect(offer.offer).toMatchObject({ region: 'us', percent: 25 });
    expect(offer.offer?.courses).toBeGreaterThan(900);

    await advanceDays(1);
    expect(await shopPrice(course.courseId)).toEqual({ price: course.priceMinor, offer: null });
    const list = await bodyOf(
      await business.get('/api/business/beacons?region=us'),
      200,
      discountBeaconListSchema,
    );
    expect(list.beacons.map((entry) => entry.status)).toEqual(['ended']);
  });

  it('refuses a second beacon that overlaps one alive, and a learner', async () => {
    expect((await beacon(25, at(0), at(3 * HOUR))).status).toBe(201);
    await expectProblem(await beacon(10, at(2 * HOUR), at(5 * HOUR)), 409, 'beacon_conflict');
    expect((await beacon(10, at(3 * HOUR), at(5 * HOUR))).status).toBe(201);
    expect((await learner.post('/api/business/beacons', {})).status).toBe(401);
  });

  it('stops discounting once cancelled', async () => {
    const [course] = await twoCourses();
    const created = await bodyOf(await beacon(40, at(0), at(HOUR)), 201, discountBeaconSchema);
    expect(created.status).toBe('active');
    expect((await shopPrice(course.courseId)).price).toBe(less(course.priceMinor, 40));
    const cancelled = await bodyOf(
      await business.post(`/api/business/beacons/${created.id}/cancel`),
      200,
      discountBeaconSchema,
    );
    expect(cancelled.status).toBe('cancelled');
    expect((await shopPrice(course.courseId)).price).toBe(course.priceMinor);
  });

  it('charges the discounted price for a basket, the wallet, and gives that back', async () => {
    const [first, second] = await twoCourses();
    expect((await beacon(25, at(0), at(2 * HOUR))).status).toBe(201);
    const opened = await bodyOf(
      await learner.post('/api/checkout/orders', {
        region: 'us',
        courseId: first.courseId,
        courseIds: [first.courseId, second.courseId],
      }),
      201,
      startedOrderSchema,
    );
    const total = less(first.priceMinor, 25) + less(second.priceMinor, 25);
    expect(opened.amount).toEqual({ currency: 'USD', minorUnits: total });
    await bodyOf(
      await learner.post(`/api/checkout/orders/${opened.orderId}/capture`),
      200,
      captureResultSchema,
    );
    const sold = (await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema))
      .sales;
    expect(sold.map((sale) => sale.amount.minorUnits).toSorted()).toEqual(
      [less(first.priceMinor, 25), less(second.priceMinor, 25)].toSorted(),
    );

    const [, , third] = (
      await bodyOf(
        await business.get('/api/business/catalogue?region=us'),
        200,
        marketCatalogueSchema,
      )
    ).courses.filter((course) => course.kind === 'hosted');
    if (!third?.offer) throw new Error('The catalogue lacks a third hosted course on offer');
    const listed = third.offer.listPrice.minorUnits;
    expect(third.priceMinor).toBe(less(listed, 25));
    await fundWallet(learner, 10_000);
    const paid = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [third.courseId] }),
      201,
      captureResultSchema,
    );
    const payments = async () =>
      (await bodyOf(await learner.get('/api/payments'), 200, paymentListSchema)).payments;
    const bought = (await payments()).find((payment) => payment.orderId === paid.orderId);
    expect(bought?.amount.minorUnits).toBe(third.priceMinor);

    // The beacon is over before the refund: what goes back is what was paid.
    const live = await bodyOf(
      await business.get('/api/business/beacons?region=us'),
      200,
      discountBeaconListSchema,
    );
    for (const entry of live.beacons) {
      await business.post(`/api/business/beacons/${entry.id}/cancel`);
    }
    expect((await learner.post(`/api/payments/${paid.orderId}/refund`)).status).toBe(200);
    const refunded = (
      await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema)
    ).sales.find((sale) => sale.orderId === paid.orderId);
    expect(refunded).toMatchObject({
      status: 'refunded',
      refundedMinor: third.priceMinor,
    });
  });
});
