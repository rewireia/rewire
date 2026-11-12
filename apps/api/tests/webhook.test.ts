import { enrolmentListSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isSignedByPayPal } from '../src/modules/checkout/webhook-signature.ts';

import { bodyOf, dashboardGet } from './support/client.ts';
import {
  createTestApi,
  expectProblem,
  signInDemo,
  startOrder,
  WEBHOOK_ID,
  type TestApi,
} from './support/test-api.ts';
import { openTopUp } from './support/wallet.ts';
import { createSigningKey, headersOf } from './support/webhooks.ts';

const key = createSigningKey();
const encode = (text: string) => new TextEncoder().encode(text);

describe('the webhook signature', () => {
  const body = encode('{"id":"WH-EVENT-1"}');

  it('is accepted when PayPal signed this body for our subscription', async () => {
    const signature = key.sign(body, WEBHOOK_ID);
    expect(await isSignedByPayPal(body, signature, WEBHOOK_ID, key.loadCertificate)).toBe(true);
  });

  it('is refused for a body changed after signing', async () => {
    const signature = key.sign(body, WEBHOOK_ID);
    const altered = encode('{"id":"WH-EVENT-2"}');
    expect(await isSignedByPayPal(altered, signature, WEBHOOK_ID, key.loadCertificate)).toBe(false);
  });

  it('is refused when it was made for another subscription', async () => {
    const signature = key.sign(body, 'WH-SOMEONE-ELSE');
    expect(await isSignedByPayPal(body, signature, WEBHOOK_ID, key.loadCertificate)).toBe(false);
  });

  it('is refused when the certificate is not served by PayPal', async () => {
    const signature = {
      ...key.sign(body, WEBHOOK_ID),
      certificateUrl: 'https://paypal.example.com/cert.pem',
    };
    const loadAnything = () => Promise.resolve(key.certificate);
    expect(await isSignedByPayPal(body, signature, WEBHOOK_ID, loadAnything)).toBe(false);
  });
});

describe('the webhook route', () => {
  let api: TestApi;

  beforeEach(async () => {
    api = await createTestApi({ overrides: { loadCertificate: key.loadCertificate } });
  });

  afterEach(async () => {
    await api.close();
  });

  const deliver = (event: unknown, headers?: Record<string, string>) => {
    const text = JSON.stringify(event);
    return api.app.request('/api/webhooks/paypal', {
      method: 'POST',
      // A server-to-server call: another origin is no reason to refuse it.
      headers: {
        Origin: 'https://www.paypal.com',
        ...(headers ?? headersOf(key.sign(encode(text), WEBHOOK_ID))),
      },
      body: text,
    });
  };

  /** An order the buyer paid at PayPal while the browser never came back to capture it. */
  const paidBehindTheCheckout = async () => {
    const learner = api.client();
    const order = await startOrder(learner, 'ai-foundations');
    const captureId = api.gateway.captureAtPayPal(order.paypalOrderId);
    const event = {
      id: 'WH-EVENT-COMPLETED',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: captureId, custom_id: order.orderId },
    };
    return { learner, order, event };
  };

  const coursesOf = async (learner: ReturnType<TestApi['client']>) =>
    (await bodyOf(await dashboardGet(learner, '/api/learning'), 200, enrolmentListSchema))
      .enrolments;

  it('answers 503 when no subscription is set up', async () => {
    await api.close();
    api = await createTestApi({ payments: false });
    await expectProblem(
      await deliver({ id: 'x', event_type: 'y' }),
      503,
      'webhooks_not_configured',
    );
  });

  it('refuses an event without a valid signature', async () => {
    await expectProblem(await deliver({ id: 'x', event_type: 'y' }, {}), 401, 'invalid_signature');
    const forged = headersOf(key.sign(encode('{"something":"else"}'), WEBHOOK_ID));
    await expectProblem(
      await deliver({ id: 'x', event_type: 'y' }, forged),
      401,
      'invalid_signature',
    );
  });

  it('settles the order a capture event is about, after reading it again at PayPal', async () => {
    const { learner, event } = await paidBehindTheCheckout();
    expect((await deliver(event)).status).toBe(204);
    expect(await coursesOf(learner)).toEqual([
      expect.objectContaining({ courseId: 'ai-foundations', status: 'active' }),
    ]);
  });

  it('deals with an event once, however many times PayPal delivers it', async () => {
    const { event } = await paidBehindTheCheckout();
    await deliver(event);
    const reads = api.gateway.calls.read;
    expect((await deliver(event)).status).toBe(204);
    expect(api.gateway.calls.read).toBe(reads);
    const ledger = await api.database.execute(
      `SELECT id FROM payment_events WHERE kind = 'capture-completed'`,
    );
    expect(ledger.rows).toHaveLength(1);
  });

  it('handles an event again when PayPal could not be read the first time', async () => {
    const { learner, event } = await paidBehindTheCheckout();
    api.gateway.failNextRead();
    await expectProblem(await deliver(event), 502, 'payment_provider_error');
    expect(await coursesOf(learner)).toEqual([]);
    expect((await deliver(event)).status).toBe(204);
    expect(await coursesOf(learner)).toHaveLength(1);
  });

  it('settles a wallet top-up a capture event is about, as a refresh does', async () => {
    const learner = api.client();
    await signInDemo(learner);
    const topUp = await openTopUp(learner, 5000);
    api.gateway.captureAtPayPal(topUp.paypalOrderId);
    const event = {
      id: 'WH-EVENT-TOP-UP',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE-ANY',
        supplementary_data: { related_ids: { order_id: topUp.paypalOrderId } },
      },
    };
    expect((await deliver(event)).status).toBe(204);
    expect(api.gateway.calls.read).toBe(1);
    const wallet = await api.database.execute(
      `SELECT status FROM wallet_top_ups WHERE id = '${topUp.topUpId}'`,
    );
    expect(wallet.rows[0]?.['status']).toBe('completed');
    expect((await deliver(event)).status).toBe(204);
    expect(api.gateway.calls.read).toBe(1);
  });

  it('accepts an event about an order it does not know', async () => {
    const response = await deliver({
      id: 'WH-EVENT-UNKNOWN',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'CAPTURE-UNKNOWN', custom_id: 'no-such-order' },
    });
    expect(response.status).toBe(204);
  });
});
