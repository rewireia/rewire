import { topUpResultSchema, walletMovementsSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  createTestApi,
  expectProblem,
  signInDemo,
  START,
  type TestApi,
} from './support/test-api.ts';
import { openTopUp, walletOf } from './support/wallet.ts';

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

const capture = async (topUpId: string) =>
  bodyOf(await learner.post(`/api/wallet/top-ups/${topUpId}/capture`), 200, topUpResultSchema);

const movements = async () =>
  (await bodyOf(await learner.get('/api/wallet/movements?region=us'), 200, walletMovementsSchema))
    .movements;

describe('adding money with PayPal', () => {
  it('adds a top-up PayPal captured exactly to the balance, once', async () => {
    const topUp = await openTopUp(learner, 5000);
    expect(topUp.amount).toEqual({ currency: 'USD', minorUnits: 5000 });
    expect(await walletOf(learner)).toMatchObject({ fundedMinor: 0, availableMinor: 0 });
    expect(await capture(topUp.topUpId)).toMatchObject({ status: 'completed', issue: null });
    expect(await capture(topUp.topUpId)).toMatchObject({ status: 'completed', issue: null });
    expect(api.gateway.calls.captured).toBe(1);
    expect(await walletOf(learner)).toMatchObject({
      currency: 'USD',
      fundedMinor: 5000,
      spentMinor: 0,
      availableMinor: 5000,
    });
    const [movement] = await movements();
    expect(movement).toMatchObject({
      id: topUp.topUpId,
      kind: 'top-up',
      amountMinor: 5000,
      status: 'completed',
      title: null,
    });
    expect(movement?.paypalReference).toMatch(/^CAPTURE-/);
  });

  it('refuses an amount outside the limits without asking PayPal', async () => {
    for (const amountMinor of [499, 50_001, 1000.5]) {
      await expectProblem(
        await learner.post('/api/wallet/top-ups', { region: 'us', amountMinor }),
        400,
        'invalid_input',
      );
    }
    await expectProblem(
      await api.client().post('/api/wallet/top-ups', { region: 'us', amountMinor: 5000 }),
      401,
      'sign_in_required',
    );
    expect(api.gateway.calls.opened).toBe(0);
  });

  it('waits for a capture PayPal holds, and counts it once PayPal releases it', async () => {
    const topUp = await openTopUp(learner, 2000);
    api.gateway.scriptCapture(topUp.paypalOrderId, 'pending');
    expect(await capture(topUp.topUpId)).toMatchObject({
      status: 'pending',
      issue: 'held-by-paypal',
    });
    expect((await walletOf(learner)).fundedMinor).toBe(0);
    api.gateway.release(topUp.paypalOrderId);
    expect(await walletOf(learner)).toMatchObject({ fundedMinor: 2000, availableMinor: 2000 });
    expect(
      await bodyOf(
        await learner.post(`/api/wallet/top-ups/${topUp.topUpId}/refresh`),
        200,
        topUpResultSchema,
      ),
    ).toMatchObject({ status: 'completed' });
    expect((await walletOf(learner)).fundedMinor).toBe(2000);
  });

  it('adds nothing for a capture PayPal declined or the buyer did not approve', async () => {
    const declined = await openTopUp(learner, 2000);
    api.gateway.scriptCapture(declined.paypalOrderId, 'declined');
    expect(await capture(declined.topUpId)).toMatchObject({ status: 'failed', issue: 'declined' });
    const unapproved = await openTopUp(learner, 3000);
    api.gateway.scriptCapture(unapproved.paypalOrderId, 'not-approved');
    expect(await capture(unapproved.topUpId)).toMatchObject({
      status: 'created',
      issue: 'not-approved',
    });
    expect((await walletOf(learner)).fundedMinor).toBe(0);
    expect((await movements()).map(({ status }) => status)).toEqual(['failed']);
  });

  it('gives back a capture of another amount and never adds it', async () => {
    const topUp = await openTopUp(learner, 5000);
    api.gateway.scriptCapture(topUp.paypalOrderId, 'mismatch');
    expect(await capture(topUp.topUpId)).toMatchObject({ status: 'refunded', issue: 'mismatch' });
    expect(api.gateway.refundRequests).toEqual([`refund-top-up-${topUp.topUpId}`]);
    expect(await capture(topUp.topUpId)).toMatchObject({ status: 'refunded' });
    expect(api.gateway.refundRequests).toHaveLength(1);
    expect((await walletOf(learner)).fundedMinor).toBe(0);
  });

  it('keeps a top-up PayPal reports in a way it cannot read out of the balance', async () => {
    const topUp = await openTopUp(learner, 5000);
    api.gateway.scriptCapture(topUp.paypalOrderId, 'unreadable');
    expect(await capture(topUp.topUpId)).toMatchObject({
      status: 'pending',
      issue: 'needs-review',
    });
    expect((await walletOf(learner)).fundedMinor).toBe(0);
  });

  it('answers 404 for a top-up of another learner', async () => {
    await api.database.execute({
      sql: `INSERT INTO learners (id, created_at) VALUES ('someone-else', ?)`,
      args: [START.toISOString()],
    });
    await api.database.execute({
      sql: `INSERT INTO wallet_top_ups (id, learner_id, region, currency, amount_minor, status,
              paypal_order_id, created_at)
            VALUES ('their-top-up', 'someone-else', 'us', 'USD', 5000, 'created', 'PAYPAL-X', ?)`,
      args: [START.toISOString()],
    });
    await expectProblem(
      await learner.post('/api/wallet/top-ups/their-top-up/capture'),
      404,
      'not_found',
    );
    await expectProblem(
      await learner.post('/api/wallet/top-ups/their-top-up/refresh'),
      404,
      'not_found',
    );
    expect(api.gateway.calls.captured).toBe(0);
  });
});
