import { findSellableCourse, stageOfLevel } from '@rewire/content';
import {
  courseRecommendationsSchema,
  enrolmentListSchema,
  startedOrderSchema,
} from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

async function learner() {
  api = await createTestApi({ overrides: { model: null } });
  const client = api.client();
  await signInDemo(client);
  await fundWallet(client, 50000);
  return client;
}

async function planFor(client: TestClient, isco08: string) {
  return bodyOf(
    await client.post('/api/marketplace/recommendations', {
      region: 'us',
      isco08,
      language: 'en',
      level: 'beginner',
      goal: 'current-job',
      weeklyHours: 20,
    }),
    200,
    courseRecommendationsSchema,
  );
}

describe('the stage of a listed course', () => {
  it('follows its level', () => {
    expect(stageOfLevel('introductory')).toBe('understand');
    expect(stageOfLevel('intermediate')).toBe('apply');
    expect(stageOfLevel('advanced')).toBe('strengthen');
  });
});

describe('the three-course plan', () => {
  it.each(['4311', '2512', '5223'])(
    'gives occupation %s three courses, one per stage, with a real listed one',
    async (isco08) => {
      const client = await learner();
      const plan = await planFor(client, isco08);
      expect(plan.courses.map((course) => course.stage)).toEqual([
        'understand',
        'apply',
        'strengthen',
      ]);
      expect(plan.totalMinor).toBeLessThanOrEqual(50000);
      const kinds = plan.courses.map((course) => findSellableCourse(course.courseId)?.kind);
      expect(kinds).toContain('listed');
      for (const course of plan.courses) {
        const sellable = findSellableCourse(course.courseId);
        expect(sellable?.stage).toBe(course.stage);
        expect(course.hours).toBe(sellable?.hours);
        expect(course.title).toBe(sellable?.title);
      }
    },
  );
});

describe('courses written for educators', () => {
  it('are not proposed to an occupation that does not teach', async () => {
    const client = await learner();
    const proposed: string[] = [];
    for (let round = 0; round < 4; round += 1) {
      const response = await client.post('/api/marketplace/recommendations', {
        region: 'us',
        isco08: '4313',
        language: 'en',
        level: 'beginner',
        goal: 'current-job',
        weeklyHours: 20,
        exclude: proposed,
      });
      const plan = await bodyOf(response, 200, courseRecommendationsSchema);
      proposed.push(...plan.courses.map((course) => course.courseId));
    }
    const topics = proposed.flatMap((id) => findSellableCourse(id)?.topics ?? []);
    expect(topics).not.toContain('education');
  });
});

describe('a listed course at its fixed price', () => {
  async function listedCourse(client: TestClient) {
    const plan = await planFor(client, '4311');
    const listed = plan.courses.find(
      (course) => findSellableCourse(course.courseId)?.kind === 'listed',
    );
    if (listed === undefined) throw new Error('The plan has no listed course');
    return listed;
  }

  async function enrolledIn(client: TestClient, courseId: string) {
    const { enrolments } = await bodyOf(
      await client.get('/api/learning'),
      200,
      enrolmentListSchema,
    );
    return enrolments.find((line) => line.courseId === courseId);
  }

  it('can be paid with PayPal and enrols the learner', async () => {
    const client = await learner();
    const course = await listedCourse(client);
    const order = await bodyOf(
      await client.post('/api/checkout/orders', { courseId: course.courseId, region: 'us' }),
      201,
      startedOrderSchema,
    );
    expect(order.amount.minorUnits).toBe(course.priceMinor);
    expect((await client.post(`/api/checkout/orders/${order.orderId}/capture`)).status).toBe(200);
    expect(await enrolledIn(client, course.courseId)).toMatchObject({
      kind: 'listed',
      status: 'active',
    });
  });

  it('can be paid from the wallet and enrols the learner', async () => {
    const client = await learner();
    const course = await listedCourse(client);
    const paid = await client.post('/api/wallet/payments', {
      region: 'us',
      courseIds: [course.courseId],
    });
    expect(paid.status).toBe(201);
    expect(await enrolledIn(client, course.courseId)).toMatchObject({
      kind: 'listed',
      status: 'active',
    });
  });
});
