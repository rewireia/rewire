import { dashboardGet } from './support/client.ts';
import { findDemoCourse, priceOf } from '@rewire/content';
import { captureResultSchema, paymentListSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createOrderStore, type OrderStore } from '../src/modules/checkout/order-store.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { paidAs } from './support/payments.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  startOrder,
  type TestApi,
} from './support/test-api.ts';

const COURSE_ID = 'ai-foundations';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const PRICE = priceOf(course, 'USD').minorUnits;

let api: TestApi;
let learner: TestClient;
let store: OrderStore;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
  store = createOrderStore(api.database, api.clock);
});

afterEach(async () => {
  await api.close();
});

const ledgerOf = async (orderId: string) =>
  (
    await api.database.execute(
      'SELECT kind, amount_minor FROM payment_events WHERE order_id = ? ORDER BY id',
      [orderId],
    )
  ).rows.map((row) => [row['kind'], row['amount_minor']]);

const sumOf = async (orderId: string) =>
  (await ledgerOf(orderId)).reduce((sum, [, amount]) => sum + Number(amount), 0);

const holdsOf = async () =>
  (await api.database.execute('SELECT order_id FROM purchase_holds')).rows.map(
    (row) => row['order_id'],
  );

const activeEnrolments = async () =>
  (await api.database.execute("SELECT order_id FROM enrolments WHERE status = 'active'")).rows;

const capture = async (orderId: string) =>
  bodyOf(await learner.post(`/api/checkout/orders/${orderId}/capture`), 200, captureResultSchema);

const refresh = async (orderId: string) =>
  bodyOf(await learner.post(`/api/payments/${orderId}/refresh`), 200, captureResultSchema);

const historyOf = async (orderId: string) =>
  (
    await bodyOf(await dashboardGet(learner, '/api/payments'), 200, paymentListSchema)
  ).payments.find((payment) => payment.orderId === orderId);

const reading = async (orderId: string) => {
  const order = await store.find(orderId);
  if (order === undefined) {
    throw new Error(`no order ${orderId}`);
  }
  return order;
};

describe('a held capture that PayPal completes and refunds before Rewire hears it complete', () => {
  it('is refunded at the next refresh, with a ledger that sums to zero and the course free', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    expect(await capture(order.orderId)).toMatchObject({ status: 'pending' });
    api.gateway.release(order.paypalOrderId);
    api.gateway.refundAtPayPal(order.paypalOrderId);

    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded', issue: null });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-pending', 0],
      ['capture-completed', PRICE],
      ['refund-completed', -PRICE],
    ]);
    expect(await holdsOf()).toEqual([]);
    expect(await activeEnrolments()).toEqual([]);
    expect(
      (await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' })).status,
    ).toBe(201);
  });

  it('stays refunded when the capture is reported completed late, or the refund again', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    await capture(order.orderId);
    const held = await reading(order.orderId);
    expect(held.paypalCaptureId).toMatch(/^CAPTURE-/);
    api.gateway.release(order.paypalOrderId);
    api.gateway.refundAtPayPal(order.paypalOrderId);

    await store.recordRefunded(held, 'webhook');
    await store.recordPaid(held, paidAs(held, held.paypalCaptureId ?? ''), 'webhook');
    await store.recordRefunded(held, 'reconciliation');
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await sumOf(order.orderId)).toBe(0);
    expect(await activeEnrolments()).toEqual([]);
    expect(await holdsOf()).toEqual([]);
  });

  it('ends the same when Rewire hears it complete first and refunded after', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    await capture(order.orderId);
    api.gateway.release(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'completed' });
    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-pending', 0],
      ['capture-completed', PRICE],
      ['refund-completed', -PRICE],
    ]);
    expect(await holdsOf()).toEqual([]);
  });
});

describe('a refund PayPal leaves pending', () => {
  it('is kept and shown as requested, and cannot be asked for again', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.holdRefunds();
    const requested = await bodyOf(
      await learner.post(`/api/payments/${orderId}/refund`),
      200,
      captureResultSchema,
    );
    expect(requested).toMatchObject({ status: 'completed', issue: 'held-by-paypal' });
    expect((await reading(orderId)).refund).toMatchObject({ id: /^REFUND-/, status: 'pending' });
    expect(await historyOf(orderId)).toMatchObject({
      status: 'completed',
      refund: 'requested',
      refundable: false,
    });
    expect(await ledgerOf(orderId)).toContainEqual(['refund-requested', 0]);
    await expectProblem(
      await learner.post(`/api/payments/${orderId}/refund`),
      409,
      'refund_in_progress',
    );
    expect(api.gateway.calls.refunded).toBe(1);
    expect(await activeEnrolments()).toHaveLength(1);
  });

  it('becomes money returned when PayPal reports the capture refunded', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.holdRefunds();
    await learner.post(`/api/payments/${orderId}/refund`);
    api.gateway.refundAtPayPal(paypalOrderId);
    expect(await refresh(orderId)).toMatchObject({ status: 'refunded' });
    expect(await historyOf(orderId)).toMatchObject({ status: 'refunded', refund: 'completed' });
    expect((await reading(orderId)).refund?.status).toBe('completed');
    expect(await sumOf(orderId)).toBe(0);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('is shown as none on a payment nobody asked to refund', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    expect(await historyOf(orderId)).toMatchObject({ refund: 'none', refundable: true });
  });
});

describe('a capture of another amount than the order asked for', () => {
  it('is kept and refunded, never gives access, and holds the course until PayPal confirms', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'mismatch');
    api.gateway.holdRefunds();
    expect(await capture(order.orderId)).toMatchObject({ status: 'pending', issue: 'mismatch' });

    const kept = await reading(order.orderId);
    expect(kept).toMatchObject({
      captureMismatch: true,
      paypalCaptureId: expect.stringMatching(/^CAPTURE-/) as unknown,
      capturedAmount: { currency: 'USD', minorUnits: PRICE - 100 },
      refund: { status: 'pending' },
    });
    expect(await activeEnrolments()).toEqual([]);
    expect(await holdsOf()).toEqual([order.orderId]);
    await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      409,
      'payment_pending',
    );
    await expectProblem(
      await learner.post(`/api/payments/${order.orderId}/refund`),
      409,
      'refund_in_progress',
    );
    expect(await refresh(order.orderId)).toMatchObject({ status: 'pending', issue: 'mismatch' });
    expect(api.gateway.calls.refunded).toBe(1);

    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-mismatched', PRICE - 100],
      ['refund-requested', 0],
      ['refund-completed', -(PRICE - 100)],
    ]);
    expect(await holdsOf()).toEqual([]);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('is refunded at the next reading when PayPal could not be asked the first time', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'mismatch');
    api.gateway.failNextRefund();
    expect(await capture(order.orderId)).toMatchObject({ status: 'pending', issue: 'mismatch' });
    expect((await reading(order.orderId)).refund).toBeUndefined();

    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(api.gateway.calls.refunded).toBe(2);
    expect(await sumOf(order.orderId)).toBe(0);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('is never paid, whatever PayPal reports for it later', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'mismatch');
    api.gateway.holdRefunds();
    await capture(order.orderId);
    const kept = await reading(order.orderId);
    await store.recordPaid(kept, paidAs(kept, kept.paypalCaptureId ?? ''), 'webhook');
    await store.recordFailed(kept, 'LATE', 'webhook');
    expect(await reading(order.orderId)).toMatchObject({
      status: 'pending',
      captureMismatch: true,
    });
    expect(await activeEnrolments()).toEqual([]);
  });
});
