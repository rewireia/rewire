import {
  captureResultSchema,
  marketSalesSchema,
  startedOrderSchema,
  walletSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, signInDemo, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi;
let learner: TestClient;
let business: TestClient;
beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
  business = api.client();
  await signInDemo(learner);
  await signInDemo(business, 'business');
});
afterEach(async () => {
  await api.close();
});

async function price(courseId: string, priceMinor: number) {
  const terms = { courseId, region: 'us', priceMinor, published: true };
  expect((await business.put(`/api/business/catalogue/${courseId}`, terms)).status).toBe(200);
}
async function budget() {
  return bodyOf(await learner.get('/api/marketplace/wallet?region=us'), 200, walletSchema);
}

describe('fixed prices', () => {
  it('charges the price published when the order was opened, not a later one', async () => {
    await price('ai-foundations', 4000);
    const order = await bodyOf(
      await learner.post('/api/checkout/orders', { courseId: 'ai-foundations', region: 'us' }),
      201,
      startedOrderSchema,
    );
    await price('ai-foundations', 6000);
    expect(order.amount.minorUnits).toBe(4000);
    const captured = await bodyOf(
      await learner.post(`/api/checkout/orders/${order.orderId}/capture`),
      200,
      captureResultSchema,
    );
    expect(captured.status).toBe('completed');
    await fundWallet(learner, 10_000);
    const fromWallet = await bodyOf(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: ['ai-for-managers'] }),
      201,
      captureResultSchema,
    );
    expect(fromWallet.status).toBe('completed');
  });

  it('keeps PayPal refunds out of the wallet and shows them in sales', async () => {
    await fundWallet(learner, 50_000);
    const order = await bodyOf(
      await learner.post('/api/checkout/orders', { courseId: 'ai-foundations', region: 'us' }),
      201,
      startedOrderSchema,
    );
    await learner.post(`/api/checkout/orders/${order.orderId}/capture`);
    api.gateway.refundPartAtPayPal(order.paypalOrderId, 100);
    expect((await learner.post(`/api/payments/${order.orderId}/refresh`)).status).toBe(200);
    expect((await learner.post(`/api/payments/${order.orderId}/refund`)).status).toBe(200);
    expect(await budget()).toMatchObject({ fundedMinor: 50_000, spentMinor: 0 });
    const sales = await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema);
    expect(sales.sales.find((sale) => sale.orderId === order.orderId)?.status).toBe('refunded');
  });

  it('refuses top-ups and payments from the wallet in live PayPal mode', async () => {
    await api.close();
    api = await createTestApi({
      environment: {
        APP_ENV: 'production',
        PAYPAL_ENV: 'live',
        PUBLIC_ORIGIN: 'http://localhost:3000',
      },
    });
    learner = api.client();
    await signInDemo(learner);
    await expectProblem(
      await learner.post('/api/wallet/top-ups', { region: 'us', amountMinor: 5000 }),
      409,
      'sandbox_required',
    );
    await expectProblem(
      await learner.post('/api/wallet/payments', { region: 'us', courseIds: ['ai-foundations'] }),
      409,
      'sandbox_required',
    );
    expect(api.gateway.calls.opened).toBe(0);
    expect((await budget()).fundedMinor).toBe(0);
  });
});
