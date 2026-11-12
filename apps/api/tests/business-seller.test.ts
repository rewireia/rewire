import { DEMO_SELLER } from '@rewire/content';
import {
  captureResultSchema,
  courseCatalogueSchema,
  marketCatalogueSchema,
  marketCourseSchema,
  marketSalesSchema,
  paymentListSchema,
  startedOrderSchema,
  type MarketCourse,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi;
let learner: TestClient;
let business: TestClient;

beforeEach(async () => {
  api = await createTestApi({ overrides: { model: null } });
  learner = api.client();
  business = api.client();
  await signInDemo(learner);
  await signInDemo(business, 'business');
});
afterEach(async () => {
  await api.close();
});

const catalogueOf = async (region = 'us') =>
  (
    await bodyOf(
      await business.get(`/api/business/catalogue?region=${region}`),
      200,
      marketCatalogueSchema,
    )
  ).courses;

const salesNow = async () =>
  bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema);

const paymentsNow = async () =>
  (await bodyOf(await learner.get('/api/payments'), 200, paymentListSchema)).payments;

const putTerms = (course: MarketCourse, changes: Partial<MarketCourse>) =>
  business.put(`/api/business/catalogue/${course.courseId}`, {
    courseId: course.courseId,
    region: course.region,
    priceMinor: course.priceMinor,
    published: course.published,
    ...changes,
  });

/** Two listed courses and one hosted course of the US catalogue, at their list prices. */
async function someCourses() {
  const courses = await catalogueOf();
  const listed = courses.filter((course) => course.kind === 'listed');
  const [first, second] = listed;
  const hosted = courses.find((course) => course.kind === 'hosted');
  if (!first || !second || !hosted) throw new Error('The catalogue lacks courses to sell');
  return { first, second, hosted };
}

/** A basket paid with the test server's fake PayPal: opened, approved and captured. */
async function buyBasketWithPayPal(courseIds: [string, ...string[]]) {
  const opened = await bodyOf(
    await learner.post('/api/checkout/orders', {
      region: 'us',
      courseId: courseIds[0],
      courseIds,
    }),
    201,
    startedOrderSchema,
  );
  const captured = await bodyOf(
    await learner.post(`/api/checkout/orders/${opened.orderId}/capture`),
    200,
    captureResultSchema,
  );
  expect(captured.status).toBe('completed');
  return opened;
}

describe('the demonstration seller’s catalogue', () => {
  it('offers every course of the region, each with the provider that wrote it', async () => {
    const us = await catalogueOf('us');
    const eu = await catalogueOf('eu');
    expect(us.length).toBeGreaterThan(900);
    expect(eu.length).toBeGreaterThan(us.length);
    for (const course of [...us, ...eu]) {
      expect(marketCourseSchema.safeParse(course).success).toBe(true);
      expect(course.provider).not.toBe(DEMO_SELLER.name);
    }
    expect(new Set(us.map((course) => course.kind))).toEqual(new Set(['hosted', 'listed']));
    expect(JSON.stringify(us)).not.toContain('minimum');
  });

  it('sells a listed course in the shop at the price the seller sets', async () => {
    const { first } = await someCourses();
    const terms = await bodyOf(
      await putTerms(first, { priceMinor: 4200 }),
      200,
      marketCourseSchema,
    );
    expect(terms).toMatchObject({ priceMinor: 4200, provider: first.provider, kind: 'listed' });
    const stored = await api.database.execute({
      sql: 'SELECT price_minor, minimum_minor FROM market_terms WHERE course_id = ?',
      args: [first.courseId],
    });
    expect(stored.rows[0]).toMatchObject({ price_minor: 4200, minimum_minor: 4200 });
    const shop = await bodyOf(
      await learner.get('/api/regions/us/courses'),
      200,
      courseCatalogueSchema,
    );
    expect(shop.courses.find((course) => course.id === first.courseId)?.price).toEqual({
      currency: 'USD',
      minorUnits: 4200,
    });
  });

  it('takes a course withdrawn from sale out of the shop', async () => {
    const { first, hosted } = await someCourses();
    for (const course of [first, hosted]) {
      expect((await putTerms(course, { published: false })).status).toBe(200);
    }
    const shop = await bodyOf(
      await learner.get('/api/regions/us/courses'),
      200,
      courseCatalogueSchema,
    );
    const onSale = new Set(shop.courses.map((course) => course.id));
    expect(onSale.has(first.courseId)).toBe(false);
    expect(onSale.has(hosted.courseId)).toBe(false);
    const after = await catalogueOf();
    expect(after.find((course) => course.courseId === first.courseId)?.published).toBe(false);
  });
});

describe('the demonstration seller’s sales', () => {
  it('starts empty: no sale and no total is made up', async () => {
    expect(await salesNow()).toEqual({ seller: DEMO_SELLER.name, sales: [], totals: [] });
  });

  it('sells each course of a basket paid with PayPal as one sale, as the learner paid it', async () => {
    const { first, second } = await someCourses();
    const order = await buyBasketWithPayPal([first.courseId, second.courseId]);
    const { sales, totals, seller } = await salesNow();
    expect(seller).toBe(DEMO_SELLER.name);
    expect(sales.map((sale) => sale.id)).toEqual([
      `${order.orderId}:${first.courseId}`,
      `${order.orderId}:${second.courseId}`,
    ]);
    const payment = (await paymentsNow()).find((entry) => entry.orderId === order.orderId);
    for (const [sale, course] of [
      [sales[0], first],
      [sales[1], second],
    ] as const) {
      expect(sale).toMatchObject({
        orderId: order.orderId,
        title: course.title,
        provider: course.provider,
        kind: 'listed',
        method: 'paypal',
        amount: { currency: 'USD', minorUnits: course.priceMinor },
        refundedMinor: 0,
        status: 'completed',
        paypalReference: payment?.paypalReference,
      });
      expect(sale?.paypalReference).toBeTruthy();
    }
    const sold = sales.reduce((sum, sale) => sum + sale.amount.minorUnits, 0);
    expect(sold).toBe(payment?.amount.minorUnits);
    expect(totals).toEqual([
      {
        currency: 'USD',
        netMinor: sold,
        reviewMinor: 0,
        refundedMinor: 0,
        sold: 2,
        refunds: 0,
        averageMinor: Math.round(sold / 2),
      },
    ]);
    expect(JSON.stringify(sales)).not.toContain('learner');
  });

  it('records a payment from the wallet balance as a sale paid with the balance', async () => {
    const { hosted } = await someCourses();
    await fundWallet(learner, 10_000);
    const paid = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [hosted.courseId] }),
      201,
      captureResultSchema,
    );
    const { sales } = await salesNow();
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      id: paid.orderId,
      orderId: paid.orderId,
      courseId: hosted.courseId,
      provider: hosted.provider,
      kind: 'hosted',
      method: 'wallet',
      amount: { currency: 'USD', minorUnits: hosted.priceMinor },
      status: 'completed',
      paypalReference: null,
    });
  });

  it('takes a refunded sale out of the totals, and shares a partial refund among a basket', async () => {
    const { first, second, hosted } = await someCourses();
    await fundWallet(learner, 10_000);
    const wallet = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [hosted.courseId] }),
      201,
      captureResultSchema,
    );
    const basket = await buyBasketWithPayPal([first.courseId, second.courseId]);
    api.gateway.refundPartAtPayPal(basket.paypalOrderId, 301);
    expect((await learner.post(`/api/payments/${basket.orderId}/refresh`)).status).toBe(200);
    expect((await learner.post(`/api/payments/${wallet.orderId}/refund`)).status).toBe(200);

    const { sales, totals } = await salesNow();
    const refunded = sales.find((sale) => sale.orderId === wallet.orderId);
    expect(refunded).toMatchObject({
      status: 'refunded',
      refundedMinor: hosted.priceMinor,
      method: 'wallet',
    });
    expect(refunded?.refundedAt).toBeTruthy();
    const lines = sales.filter((sale) => sale.orderId === basket.orderId);
    expect(lines.every((sale) => sale.status === 'completed')).toBe(true);
    expect(lines.reduce((sum, sale) => sum + sale.refundedMinor, 0)).toBe(301);
    const gross = first.priceMinor + second.priceMinor;
    expect(totals).toEqual([
      {
        currency: 'USD',
        netMinor: gross - 301,
        reviewMinor: 0,
        refundedMinor: hosted.priceMinor + 301,
        sold: 2,
        refunds: 3,
        averageMinor: Math.round((gross - 301) / 2),
      },
    ]);
    const learnerSees = (await paymentsNow()).find((entry) => entry.orderId === wallet.orderId);
    expect(learnerSees?.status).toBe('refunded');
  });

  it('is the business role’s alone', async () => {
    expect((await learner.get('/api/business/sales')).status).toBe(401);
    expect((await learner.get('/api/business/catalogue?region=us')).status).toBe(401);
  });
});
