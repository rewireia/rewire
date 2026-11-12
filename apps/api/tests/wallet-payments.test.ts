import {
  captureResultSchema,
  enrolmentListSchema,
  marketSalesSchema,
  paymentListSchema,
  walletMovementsSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  signInDemo,
  type TestApi,
} from './support/test-api.ts';
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

describe('paying from the wallet', () => {
  it('pays one course, then several in one order, as any other payment', async () => {
    await fundWallet(learner, 10_000);
    const one = await bodyOf(await pay(['ai-foundations']), 201, captureResultSchema);
    expect(one).toMatchObject({ status: 'completed', courseId: 'ai-foundations', issue: null });
    const two = await bodyOf(
      await pay(['ai-for-office-work', 'ai-for-managers']),
      201,
      captureResultSchema,
    );
    expect(two.status).toBe('completed');
    expect(await walletOf(learner)).toMatchObject({
      fundedMinor: 10_000,
      spentMinor: 9500,
      availableMinor: 500,
    });
    expect(api.gateway.calls.opened).toBe(1);
    const payments = (await bodyOf(await learner.get('/api/payments'), 200, paymentListSchema))
      .payments;
    expect(payments.find((payment) => payment.orderId === two.orderId)).toMatchObject({
      method: 'wallet',
      amount: { currency: 'USD', minorUnits: 7000 },
      status: 'completed',
      paypalReference: null,
      refundable: true,
    });
    const learning = await bodyOf(await learner.get('/api/learning'), 200, enrolmentListSchema);
    expect(learning.enrolments.map((enrolment) => enrolment.courseId).toSorted()).toEqual([
      'ai-for-managers',
      'ai-for-office-work',
      'ai-foundations',
    ]);
    expect(
      await count(`SELECT COUNT(*) total FROM order_items WHERE order_id = '${two.orderId}'`),
    ).toBe(2);
    expect(
      await count(
        `SELECT SUM(amount_minor) total FROM payment_events WHERE kind = 'wallet-paid'
          AND order_id IN ('${one.orderId}', '${two.orderId}')`,
      ),
    ).toBe(9500);
    const sales = await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema);
    expect(sales.sales.filter((sale) => sale.orderId === two.orderId)).toHaveLength(2);
    expect((await movements()).filter(({ kind }) => kind === 'course-payment')).toHaveLength(2);
  });

  it('refuses a payment the balance does not cover, and changes nothing', async () => {
    await fundWallet(learner, 1000);
    const problem = await expectProblem(await pay(['ai-foundations']), 409, 'insufficient_balance');
    expect(problem.detail).toContain('PayPal');
    expect(await count("SELECT COUNT(*) total FROM orders WHERE method = 'wallet'")).toBe(0);
    expect(await count('SELECT COUNT(*) total FROM purchase_holds')).toBe(0);
    expect(await walletOf(learner)).toMatchObject({ fundedMinor: 1000, availableMinor: 1000 });
  });

  it('charges once for a payment sent twice', async () => {
    await fundWallet(learner, 10_000);
    const answers = await Promise.all([pay(['ai-foundations']), pay(['ai-foundations'])]);
    expect(answers.map(({ status }) => status).toSorted()).toEqual([201, 409]);
    expect((await walletOf(learner)).spentMinor).toBe(2500);
    expect(await count("SELECT COUNT(*) total FROM orders WHERE method = 'wallet'")).toBe(1);
  });

  it('never spends more than the balance when two payments race', async () => {
    await fundWallet(learner, 3000);
    const answers = await Promise.all([pay(['ai-foundations']), pay(['ai-for-office-work'])]);
    expect(answers.map(({ status }) => status).toSorted()).toEqual([201, 409]);
    expect((await walletOf(learner)).availableMinor).toBeGreaterThanOrEqual(0);
    expect(await count("SELECT COUNT(*) total FROM orders WHERE method = 'wallet'")).toBe(1);
  });

  it('refuses a course the learner already has', async () => {
    await fundWallet(learner, 10_000);
    const bought = await buyCourse(learner, 'ai-foundations');
    expect(bought.captured.status).toBe('completed');
    await expectProblem(await pay(['ai-foundations']), 409, 'already_enrolled');
    expect((await walletOf(learner)).spentMinor).toBe(0);
  });

  it('refuses an unknown course, a repeated one, or more than ten', async () => {
    await fundWallet(learner, 10_000);
    await expectProblem(await pay(['not-a-course']), 404, 'not_found');
    await expectProblem(await pay(['ai-foundations', 'ai-foundations']), 400, 'invalid_request');
    await expectProblem(
      await pay(Array.from({ length: 11 }, (_, index) => `course-${index}`)),
      400,
      'invalid_input',
    );
    expect((await walletOf(learner)).spentMinor).toBe(0);
  });
});
