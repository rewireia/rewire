import { DEMO_SELLER } from '@rewire/content';
import {
  captureResultSchema,
  catalogueSearchResultSchema,
  courseCatalogueSchema,
  enrolmentListSchema,
  listedEnrolmentSchema,
  marketSalesSchema,
  sellerCourseListSchema,
  sellerCourseSchema,
  startedOrderSchema,
  type SellerCourseInput,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, signInDemo, type TestApi } from './support/test-api.ts';
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

const COURSE: SellerCourseInput = {
  region: 'us',
  title: 'Spreadsheet automation with <b>AI</b> assistants',
  summary:
    'Build spreadsheet formulas and clean tables with an AI assistant, and check every result it gives.',
  level: 'introductory',
  hours: 3,
  language: 'en',
  topics: ['ai-at-work'],
  accessUrl: 'https://learn.example.com/sun-school/spreadsheets',
  priceMinor: 2400,
  published: true,
};

const publish = async (input: SellerCourseInput = COURSE) =>
  bodyOf(await business.post('/api/business/courses', input), 201, sellerCourseSchema);

const shop = async () =>
  bodyOf(await learner.get('/api/regions/us/courses'), 200, courseCatalogueSchema);

const sales = async () =>
  (await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema)).sales;

describe('a course the seller publishes', () => {
  it('is kept as plain text with an id of its own, and listed for the seller', async () => {
    const course = await publish();
    expect(course.id).toMatch(/^sun-spreadsheet-automation-with-ai-assistants-[0-9a-f]{6}$/);
    expect(course.title).toBe('Spreadsheet automation with AI assistants');
    expect(course.price).toEqual({ currency: 'USD', minorUnits: 2400 });
    const listed = await bodyOf(
      await business.get('/api/business/courses?region=us'),
      200,
      sellerCourseListSchema,
    );
    expect(listed.courses.map((entry) => entry.id)).toEqual([course.id]);
    const elsewhere = await bodyOf(
      await business.get('/api/business/courses?region=eu'),
      200,
      sellerCourseListSchema,
    );
    expect(elsewhere.courses).toEqual([]);
  });

  it('is refused with unknown subjects, too short a text, or by a learner', async () => {
    await expectProblem(
      await business.post('/api/business/courses', { ...COURSE, topics: ['astrology'] }),
      400,
      'invalid_input',
    );
    await expectProblem(
      await business.post('/api/business/courses', { ...COURSE, summary: 'Too short.' }),
      400,
      'invalid_input',
    );
    expect((await learner.post('/api/business/courses', COURSE)).status).toBe(401);
  });

  it('is sold in the shop by the seller, found by search, and withdrawn from both', async () => {
    const course = await publish();
    const card = (await shop()).courses.find((entry) => entry.id === course.id);
    expect(card).toMatchObject({
      kind: 'listed',
      provider: DEMO_SELLER.name,
      url: null,
      providerAccess: 'paid',
      checkedOn: course.updatedAt.slice(0, 10),
      price: { currency: 'USD', minorUnits: 2400 },
    });
    expect(JSON.stringify(card)).not.toContain('learn.example.com');
    const search = () =>
      learner.post('/api/courses/search', {
        region: 'us',
        language: 'en',
        query: 'spreadsheet automation formulas',
      });
    const found = await bodyOf(await search(), 200, catalogueSearchResultSchema);
    expect(found.matches.map((match) => match.courseId)).toContain(course.id);

    const withdrawn = await bodyOf(
      await business.put(`/api/business/courses/${course.id}`, { ...COURSE, published: false }),
      200,
      sellerCourseSchema,
    );
    expect(withdrawn.published).toBe(false);
    expect((await shop()).courses.some((entry) => entry.id === course.id)).toBe(false);
    const again = await bodyOf(await search(), 200, catalogueSearchResultSchema);
    expect(again.matches.map((match) => match.courseId)).not.toContain(course.id);
  });

  it('takes a new price from the catalogue terms, as any course', async () => {
    const course = await publish();
    const terms = { courseId: course.id, region: 'us', priceMinor: 3100, published: true };
    expect((await business.put(`/api/business/catalogue/${course.id}`, terms)).status).toBe(200);
    const card = (await shop()).courses.find((entry) => entry.id === course.id);
    expect(card?.price).toEqual({ currency: 'USD', minorUnits: 3100 });
  });

  it('is paid, enrolled and sold, and its address is given only to who bought it', async () => {
    const course = await publish();
    const address = `/api/learning/listed-courses/${course.id}`;
    expect((await learner.get(address)).status).toBe(404);

    const opened = await bodyOf(
      await learner.post('/api/checkout/orders', {
        region: 'us',
        courseId: course.id,
        courseIds: [course.id],
      }),
      201,
      startedOrderSchema,
    );
    expect(opened.amount).toEqual({ currency: 'USD', minorUnits: 2400 });
    await bodyOf(
      await learner.post(`/api/checkout/orders/${opened.orderId}/capture`),
      200,
      captureResultSchema,
    );
    const access = await bodyOf(await learner.get(address), 200, listedEnrolmentSchema);
    expect(access).toMatchObject({ url: COURSE.accessUrl, provider: DEMO_SELLER.name });
    const mine = await bodyOf(await learner.get('/api/learning'), 200, enrolmentListSchema);
    expect(mine.enrolments.some((line) => line.courseId === course.id)).toBe(true);
    expect((await sales()).find((sale) => sale.courseId === course.id)).toMatchObject({
      provider: DEMO_SELLER.name,
      amount: { currency: 'USD', minorUnits: 2400 },
      status: 'completed',
    });
    // Another visitor, who did not buy it, is not told where it is taken.
    const stranger = await api.client().get(address);
    expect(stranger.status).toBe(401);
    expect(await stranger.text()).not.toContain('learn.example.com');
  });

  it('is paid from the wallet balance as any other course', async () => {
    const course = await publish();
    await fundWallet(learner, 5000);
    const paid = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [course.id] }),
      201,
      captureResultSchema,
    );
    expect(paid.status).toBe('completed');
    expect((await sales()).find((sale) => sale.orderId === paid.orderId)?.method).toBe('wallet');
  });
});
