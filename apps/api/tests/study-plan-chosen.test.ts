import { captureResultSchema, type StudyTimeline } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { coursesOf, PAID, readTimeline, TODAY } from './support/study-plan.ts';
import { createTestApi, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

/** Courses of the catalogue that may or may not be in the payroll clerk's plan already. */
const CANDIDATES = ['checking-ai-work', 'ai-for-managers', 'ai-for-technicians-and-trades'];

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi({ overrides: { model: null } });
  learner = api.client();
  await signInDemo(learner);
});

afterEach(async () => {
  await api.close();
});

const choose = (courseIds: string[]) =>
  learner.put('/api/marketplace/roadmap', { region: 'us', courseIds });

/** A course of the catalogue that the plan of the occupation does not have. */
function notInPlan(timeline: StudyTimeline): string {
  const ids = new Set(coursesOf(timeline).map(({ id }) => id));
  const found = CANDIDATES.find((id) => !ids.has(id));
  if (found === undefined) {
    throw new Error('every candidate is already in the plan');
  }
  return found;
}

describe('the courses the learner adds to the plan', () => {
  it('join the plan in their step, as paid courses waiting for their payment', async () => {
    const added = notInPlan(await readTimeline(learner));
    expect((await choose([added])).status).toBe(200);

    const course = coursesOf(await readTimeline(learner)).find(({ id }) => id === added);
    expect(course).toMatchObject({ kind: 'paid', addedByLearner: true, payment: 'due' });
    expect((course?.booking?.startsOn ?? '') >= TODAY).toBe(true);
  });

  it('leave the plan when they are taken out of the roadmap', async () => {
    const added = notInPlan(await readTimeline(learner));
    await choose([added]);
    expect((await choose([])).status).toBe(200);

    const ids = coursesOf(await readTimeline(learner)).map(({ id }) => id);
    expect(ids).not.toContain(added);
  });

  it('are never counted twice when the plan already has them', async () => {
    await choose([PAID]);
    const ids = coursesOf(await readTimeline(learner)).map(({ id }) => id);
    expect(ids.filter((id) => id === PAID)).toHaveLength(1);
  });

  it('count as paid once paid from the wallet, from that day', async () => {
    const added = notInPlan(await readTimeline(learner));
    await choose([added]);
    await fundWallet(learner, 20_000);
    const paid = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: [added] }),
      201,
      captureResultSchema,
    );
    expect(paid.status).toBe('completed');

    const course = coursesOf(await readTimeline(learner)).find(({ id }) => id === added);
    expect(course).toMatchObject({ payment: 'paid', paidOn: TODAY });
  });
});
