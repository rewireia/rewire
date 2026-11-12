import { findDemoCourse, priceOf } from '@rewire/content';
import { captureResultSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createOrderStore,
  type Order,
  type OrderStore,
} from '../src/modules/checkout/order-store.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { paidAs } from './support/payments.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  startOrder,
  WEBHOOK_ID,
  type TestApi,
} from './support/test-api.ts';
import { createSigningKey, headersOf } from './support/webhooks.ts';

const COURSE_ID = 'ai-for-office-work';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const PRICE = priceOf(course, 'USD').minorUnits;
const key = createSigningKey();

let api: TestApi;
let learner: TestClient;
/** The store as a late call sees it: it writes with a reading of the order made earlier. */
let store: OrderStore;

beforeEach(async () => {
  api = await createTestApi({ overrides: { loadCertificate: key.loadCertificate } });
  learner = api.client();
  store = createOrderStore(api.database, api.clock);
});

afterEach(async () => {
  await api.close();
});

/** An order as it was read before the steps that follow it. */
const readingOf = async (orderId: string): Promise<Order> => {
  const order = await store.find(orderId);
  if (order === undefined) {
    throw new Error(`no order ${orderId}`);
  }
  return order;
};

const ledgerOf = async (orderId: string) =>
  (
    await api.database.execute(
      'SELECT kind, amount_minor FROM payment_events WHERE order_id = ? ORDER BY id',
      [orderId],
    )
  ).rows.map((row) => [row['kind'], row['amount_minor']]);

const sumOf = async (orderId: string) =>
  (await ledgerOf(orderId)).reduce((sum, [, amount]) => sum + Number(amount), 0);

const enrolmentOf = async () =>
  (await api.database.execute('SELECT order_id, status FROM enrolments')).rows.map((row) => [
    row['order_id'],
    row['status'],
  ]);

const statusOf = async (orderId: string) => (await readingOf(orderId)).status;

const refund = async (orderId: string) =>
  bodyOf(await learner.post(`/api/payments/${orderId}/refund`), 200, captureResultSchema);

const refresh = async (orderId: string) =>
  bodyOf(await learner.post(`/api/payments/${orderId}/refresh`), 200, captureResultSchema);

const capture = async (orderId: string) =>
  bodyOf(await learner.post(`/api/checkout/orders/${orderId}/capture`), 200, captureResultSchema);

let events = 0;
/** A signed capture event of PayPal about an order, each with an id of its own. */
const notify = async (type: string, order: Order) => {
  events += 1;
  const text = JSON.stringify({
    id: `WH-EVENT-${String(events)}`,
    event_type: `PAYMENT.CAPTURE.${type}`,
    resource: { id: order.paypalCaptureId ?? 'CAPTURE-UNKNOWN', custom_id: order.id },
  });
  const response = await api.app.request('/api/webhooks/paypal', {
    method: 'POST',
    headers: headersOf(key.sign(new TextEncoder().encode(text), WEBHOOK_ID)),
    body: text,
  });
  expect(response.status).toBe(204);
};

describe('a confirmation that arrives after the refund', () => {
  it('leaves the order refunded and the course closed', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    const earlier = await readingOf(orderId);
    await refund(orderId);
    await store.recordPaid(earlier, paidAs(earlier, earlier.paypalCaptureId ?? ''), 'webhook');
    expect(await statusOf(orderId)).toBe('refunded');
    expect(await enrolmentOf()).toEqual([[orderId, 'revoked']]);
    expect(await sumOf(orderId)).toBe(0);
  });

  it('nor does a late hold or failure reopen or change it', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    const earlier = await readingOf(orderId);
    await refund(orderId);
    await store.recordPending(
      earlier,
      { captureId: earlier.paypalCaptureId ?? '', amount: earlier.amount },
      'webhook',
    );
    await store.recordFailed(earlier, 'LATE', 'reconciliation');
    expect(await statusOf(orderId)).toBe('refunded');
    expect(await enrolmentOf()).toEqual([[orderId, 'revoked']]);
    expect(await ledgerOf(orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
      ['refund-completed', -PRICE],
    ]);
  });

  it('of an earlier order leaves a course bought again with its own order', async () => {
    const first = await buyCourse(learner, COURSE_ID);
    const earlier = await readingOf(first.orderId);
    await refund(first.orderId);
    const second = await buyCourse(learner, COURSE_ID);
    await store.recordPaid(earlier, paidAs(earlier, earlier.paypalCaptureId ?? ''), 'webhook');
    await store.recordRefunded(earlier, 'webhook');
    expect(await enrolmentOf()).toEqual([[second.orderId, 'active']]);
    expect(await sumOf(first.orderId)).toBe(0);
    expect(await sumOf(second.orderId)).toBe(PRICE);
  });

  it('does not pay an order that failed', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'declined');
    const earlier = await readingOf(order.orderId);
    await capture(order.orderId);
    await store.recordPaid(earlier, paidAs(earlier, 'CAPTURE-LATE'), 'webhook');
    expect(await statusOf(order.orderId)).toBe('failed');
    expect(await enrolmentOf()).toEqual([]);
    expect(await sumOf(order.orderId)).toBe(0);
  });
});

describe('a refund reported more than once', () => {
  it('is one ledger row, by whatever reference and route it arrives', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    const earlier = await readingOf(orderId);
    await refund(orderId);
    await store.recordRefunded(earlier, 'webhook');
    await store.recordRefunded(earlier, 'reconciliation');
    await notify('REFUNDED', earlier);
    await refresh(orderId);
    const refunds = (await ledgerOf(orderId)).filter(([kind]) => kind === 'refund-completed');
    expect(refunds).toEqual([['refund-completed', -PRICE]]);
    expect(await sumOf(orderId)).toBe(0);
  });

  it('made from the merchant account and then asked for by the learner, sums to zero', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    const order = await readingOf(orderId);
    api.gateway.refundAtPayPal(paypalOrderId);
    await notify('REFUNDED', order);
    await expectProblem(
      await learner.post(`/api/payments/${orderId}/refund`),
      409,
      'refund_not_allowed',
    );
    await refresh(orderId);
    expect(await sumOf(orderId)).toBe(0);
    expect(await enrolmentOf()).toEqual([[orderId, 'revoked']]);
  });

  it('held by PayPal and finished later sums to zero, whichever route reports it first', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    const order = await readingOf(orderId);
    api.gateway.holdRefunds();
    await refund(orderId);
    api.gateway.refundAtPayPal(paypalOrderId);
    await refresh(orderId);
    await notify('REFUNDED', order);
    await refresh(orderId);
    expect(await statusOf(orderId)).toBe('refunded');
    expect(await sumOf(orderId)).toBe(0);
  });
});

describe('a capture reported by the checkout, a webhook and a reconciliation', () => {
  it('is one payment, in any order and however often', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.captureAtPayPal(order.paypalOrderId);
    const paid = await readingOf(order.orderId);
    await notify('COMPLETED', paid);
    await capture(order.orderId);
    await refresh(order.orderId);
    await notify('COMPLETED', paid);
    const captureId = (await readingOf(order.orderId)).paypalCaptureId ?? '';
    await store.recordPaid(paid, paidAs(paid, captureId), 'webhook');
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
    ]);
    expect(await enrolmentOf()).toEqual([[order.orderId, 'active']]);
  });

  it('and then refunded by each of them, sums to zero', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    const paid = await readingOf(orderId);
    await notify('COMPLETED', paid);
    await refund(orderId);
    await capture(orderId);
    await notify('REFUNDED', paid);
    await notify('COMPLETED', paid);
    await refresh(orderId);
    await store.recordPaid(paid, paidAs(paid, paid.paypalCaptureId ?? ''), 'reconciliation');
    expect(await statusOf(orderId)).toBe('refunded');
    expect(await sumOf(orderId)).toBe(0);
    expect(await enrolmentOf()).toEqual([[orderId, 'revoked']]);
  });
});
