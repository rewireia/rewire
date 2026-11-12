import {
  captureResultSchema,
  marketSalesSchema,
  startedOrderSchema,
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

async function signed(role: 'learner' | 'business') {
  const client = api.client();
  await signInDemo(client, role);
  return client;
}

describe('demo marketplace', () => {
  it('sells at the fixed price, with PayPal or from the wallet, as anonymous sales', async () => {
    const learner = await signed('learner');
    const business = await signed('business');
    await fundWallet(learner, 10_000);
    const order = await bodyOf(
      await learner.post('/api/checkout/orders', { courseId: 'ai-foundations', region: 'us' }),
      201,
      startedOrderSchema,
    );
    expect((await learner.post(`/api/checkout/orders/${order.orderId}/capture`)).status).toBe(200);
    const fromWallet = await bodyOf(
      await learner.post('/api/wallet/payments', {
        region: 'us',
        courseIds: ['ai-for-office-work'],
      }),
      201,
      captureResultSchema,
    );
    const wallet = await bodyOf(
      await learner.get('/api/marketplace/wallet?region=us'),
      200,
      walletSchema,
    );
    expect(wallet.fundedMinor).toBe(10_000);
    expect(wallet.availableMinor).toBe(10_000 - wallet.spentMinor);
    const sales = await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema);
    const sold = sales.sales.map((sale) => sale.orderId);
    expect(sold).toEqual(expect.arrayContaining([order.orderId, fromWallet.orderId]));
    expect(JSON.stringify(sales)).not.toContain('learner');
  });

  it('keeps the wallet for the signed-in learner', async () => {
    const business = await signed('business');
    for (const [method, path] of [
      ['get', '/api/marketplace/wallet?region=us'],
      ['get', '/api/wallet/movements?region=us'],
      ['post', '/api/wallet/top-ups'],
      ['post', '/api/wallet/payments'],
    ] as const) {
      const response =
        method === 'get'
          ? await business.get(path)
          : await business.post(path, { region: 'us', amountMinor: 5000, courseIds: ['x'] });
      await expectProblem(response, 401, 'sign_in_required');
    }
    await expectProblem(
      await (await signed('learner')).get('/api/business/sales'),
      401,
      'sign_in_required',
    );
  });
});
