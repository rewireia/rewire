import {
  captureResultSchema,
  enrolmentListSchema,
  paymentListSchema,
  startedOrderSchema,
  walletMovementsSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet, walletOf } from './support/wallet.ts';

let api: TestApi;
let learner: TestClient;
let business: TestClient;

beforeEach(async () => {
  api = await createTestApi({ overrides: { model: null } });
  learner = api.client();
  business = api.client();
  await signInDemo(learner);
  await signInDemo(business, 'business');
  await setPrice('ai-foundations', 2500);
  await setPrice('ai-for-office-work', 3000);
  await setPrice('ai-for-managers', 4000);
});
afterEach(async () => {
  await api.close();
});

async function setPrice(courseId: string, priceMinor: number) {
  const terms = { courseId, region: 'us', priceMinor, published: true };
  expect((await business.put(`/api/business/catalogue/${courseId}`, terms)).status).toBe(200);
}

const pay = (courseIds: string[]) =>
  learner.post('/api/wallet/payments', { region: 'us', courseIds });

const movements = async () =>
  (await bodyOf(await learner.get('/api/wallet/movements?region=us'), 200, walletMovementsSchema))
    .movements;

const count = async (sql: string) =>
  Number((await api.database.execute(sql)).rows[0]?.['total'] ?? Number.NaN);

describe('refunds back to the wallet', () => {
  it('refunds a payment from the wallet back to it, without PayPal, and closes the course', async () => {
    await fundWallet(learner, 5000);
    const paid = await bodyOf(await pay(['ai-foundations']), 201, captureResultSchema);
    const refunded = await bodyOf(
      await learner.post(`/api/payments/${paid.orderId}/refund`),
      200,
      captureResultSchema,
    );
    expect(refunded.status).toBe('refunded');
    expect(api.gateway.calls.refunded).toBe(0);
    expect(await walletOf(learner)).toMatchObject({ spentMinor: 0, availableMinor: 5000 });
    const learning = await bodyOf(await learner.get('/api/learning'), 200, enrolmentListSchema);
    expect(learning.enrolments.some((item) => item.courseId === 'ai-foundations')).toBe(false);
    expect(
      await count(
        `SELECT SUM(amount_minor) total FROM payment_events WHERE order_id = '${paid.orderId}'`,
      ),
    ).toBe(0);
    expect((await movements()).map(({ kind, amountMinor }) => [kind, amountMinor])).toEqual(
      expect.arrayContaining([
        ['refund', 2500],
        ['course-payment', -2500],
        ['top-up', 5000],
      ]),
    );
    await expectProblem(
      await learner.post(`/api/payments/${paid.orderId}/refund`),
      409,
      'refund_not_allowed',
    );
    expect((await pay(['ai-foundations'])).status).toBe(201);
  });
});

describe('paying with PayPal directly', () => {
  it('neither needs nor touches the wallet, and takes up to ten courses', async () => {
    const courseIds = [
      'ai-foundations',
      'ai-for-office-work',
      'ai-for-managers',
      'checking-ai-work',
    ];
    const order = await bodyOf(
      await learner.post('/api/checkout/orders', {
        courseId: courseIds[0],
        courseIds,
        region: 'us',
      }),
      201,
      startedOrderSchema,
    );
    expect((await learner.post(`/api/checkout/orders/${order.orderId}/capture`)).status).toBe(200);
    expect(await walletOf(learner)).toMatchObject({ fundedMinor: 0, spentMinor: 0 });
    expect(api.gateway.descriptions).toEqual(['Sun School — 4 courses']);
    const eleven = Array.from({ length: 11 }, (_, index) => `course-${index}`);
    await expectProblem(
      await learner.post('/api/checkout/orders', {
        courseId: eleven[0],
        courseIds: eleven,
        region: 'us',
      }),
      400,
      'invalid_input',
    );
  });
});

describe('who sells, as the buyer reads it', () => {
  it('names the seller at PayPal and in the payments, and Rewire for a top-up', async () => {
    await fundWallet(learner, 5000);
    const order = await bodyOf(
      await learner.post('/api/checkout/orders', { courseId: 'ai-foundations', region: 'us' }),
      201,
      startedOrderSchema,
    );
    await learner.post(`/api/checkout/orders/${order.orderId}/capture`);
    expect(api.gateway.descriptions).toEqual([
      'Rewire wallet top-up',
      expect.stringMatching(/^Sun School — AI foundations/),
    ]);
    expect(api.gateway.descriptions.every((text) => text.length <= 127)).toBe(true);
    const payments = await bodyOf(await learner.get('/api/payments'), 200, paymentListSchema);
    expect(payments.payments.map((payment) => payment.seller)).toEqual(['Sun School']);
  });
});
