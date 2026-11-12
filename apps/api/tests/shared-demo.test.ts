import {
  captureResultSchema,
  enrolmentListSchema,
  paymentListSchema,
  sessionSchema,
  walletSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf } from './support/client.ts';
import { createTestApi, expectProblem, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi;
beforeEach(async () => {
  api = await createTestApi();
});
afterEach(async () => {
  await api.close();
});

const PROFILE = {
  region: 'us',
  occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
  timeByTask: {},
};

describe('shared demo learner', () => {
  it('adopts the first visitor and shares profile, wallet and purchases after sign-in', async () => {
    const first = api.client();
    const second = api.client();
    await first.put('/api/session/profile', PROFILE);
    await signInDemo(first);
    await fundWallet(first, 10000);
    const courseId = 'ai-foundations';
    const order = await bodyOf(
      await first.post('/api/wallet/payments', { courseIds: [courseId], region: 'us' }),
      201,
      captureResultSchema,
    );
    expect(order.status).toBe('completed');
    await expectProblem(await second.get('/api/payments'), 401, 'sign_in_required');
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toBeNull();
    await signInDemo(second);
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toEqual(
      PROFILE,
    );
    expect(
      (await bodyOf(await second.get('/api/marketplace/wallet?region=us'), 200, walletSchema))
        .spentMinor,
    ).toBeGreaterThan(0);
    expect(
      (await bodyOf(await second.get('/api/payments'), 200, paymentListSchema)).payments.some(
        (payment) => payment.orderId === order.orderId,
      ),
    ).toBe(true);
    expect(
      (await bodyOf(await second.get('/api/learning'), 200, enrolmentListSchema)).enrolments.some(
        (course) => course.courseId === courseId,
      ),
    ).toBe(true);
    await second.post('/api/session/sign-out');
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toBeNull();
    await expectProblem(
      await second.get('/api/marketplace/wallet?region=us'),
      401,
      'sign_in_required',
    );
  });
  it('keeps business role separate and resumes the same learner when switching back', async () => {
    const browser = api.client();
    await browser.put('/api/session/profile', PROFILE);
    await signInDemo(browser);
    await signInDemo(browser, 'business');
    const business = await bodyOf(await browser.get('/api/session'), 200, sessionSchema);
    expect(business.accessRole).toBe('business');
    expect(business.profile).toBeNull();
    await expectProblem(await browser.get('/api/payments'), 401, 'sign_in_required');
    await signInDemo(browser);
    expect((await bodyOf(await browser.get('/api/session'), 200, sessionSchema)).profile).toEqual(
      PROFILE,
    );
  });
  it('chooses one canonical identity when the first two sign-ins race', async () => {
    const first = api.client();
    const second = api.client();
    await first.put('/api/session/profile', PROFILE);
    await second.put('/api/session/profile', PROFILE);
    await Promise.all([signInDemo(first), signInDemo(second)]);
    await fundWallet(first, 10000);
    expect(
      (await bodyOf(await second.get('/api/marketplace/wallet?region=us'), 200, walletSchema))
        .fundedMinor,
    ).toBe(10000);
    const identities = await api.database.execute('SELECT COUNT(*) AS total FROM demo_identity');
    expect(identities.rows[0]?.['total']).toBe(1);
    const learners = await api.database.execute('SELECT COUNT(*) AS total FROM learners');
    expect(learners.rows[0]?.['total']).toBe(2);
  });
});
