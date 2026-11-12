import { captureResultSchema, courseRecommendationsSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi;
beforeEach(async () => {
  api = await createTestApi({ overrides: { model: null } });
});
afterEach(async () => {
  await api.close();
});

const ask = (client: TestClient, isco08 = '4313') =>
  client.post('/api/marketplace/recommendations', {
    region: 'us',
    isco08,
    language: 'en',
    level: 'beginner',
    goal: 'current-job',
    weeklyHours: 20,
  });

const planOf = async (client: TestClient) =>
  bodyOf(await ask(client), 200, courseRecommendationsSchema);

/** The course the plan opens with: the first of its three. */
async function opening(client: TestClient) {
  const [first] = (await planOf(client)).courses;
  if (first === undefined) throw new Error('The plan has no course');
  return first;
}

describe('the training the plan offers', () => {
  it('is for the learner role only, and for an occupation that exists', async () => {
    const browser = api.client();
    await expectProblem(await ask(browser), 401, 'sign_in_required');
    await signInDemo(browser, 'business');
    await expectProblem(await ask(browser), 401, 'sign_in_required');
    await signInDemo(browser);
    await expectProblem(await ask(browser, 'not-a-code'), 400, 'invalid_input');
    await expectProblem(await ask(browser, '9999'), 404, 'not_found');
  });

  it('is three published courses the wallet covers, and none before it is funded', async () => {
    const learner = api.client();
    await signInDemo(learner);
    await expectProblem(await ask(learner), 409, 'marketplace_conflict');
    await fundWallet(learner, 50_000);
    const plan = await planOf(learner);
    expect(plan.courses).toHaveLength(3);
    expect(plan.courses.every((course) => course.affordable && course.summary !== '')).toBe(true);
    expect(JSON.stringify(plan)).not.toContain('minimum');
  });

  it('leaves out a course the seller withdraws from sale', async () => {
    const learner = api.client();
    const business = api.client();
    await signInDemo(learner);
    await signInDemo(business, 'business');
    await fundWallet(learner, 50_000);
    const course = await opening(learner);
    const terms = { courseId: course.courseId, region: 'us', priceMinor: 5000, published: false };
    expect((await business.put(`/api/business/catalogue/${course.courseId}`, terms)).status).toBe(
      200,
    );
    const plan = await planOf(learner);
    expect(plan.courses.some((entry) => entry.courseId === course.courseId)).toBe(false);
  });

  it('leaves out a course the learner has paid for, until it is refunded', async () => {
    const learner = api.client();
    await signInDemo(learner);
    await fundWallet(learner, 50_000);
    const course = await opening(learner);
    const offered = async () =>
      (await planOf(learner)).courses.some((entry) => entry.courseId === course.courseId);
    const paid = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [course.courseId] }),
      201,
      captureResultSchema,
    );
    expect(await offered()).toBe(false);
    expect((await learner.post(`/api/payments/${paid.orderId}/refund`)).status).toBe(200);
    expect(await offered()).toBe(true);
  });
});
