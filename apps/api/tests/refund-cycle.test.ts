import { dashboardGet } from './support/client.ts';
import { findDemoCourse, priceOf } from '@rewire/content';
import { captureResultSchema, paymentListSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createOrderStore, type OrderStore } from '../src/modules/checkout/order-store.ts';

import { bodyOf, type TestClient } from './support/client.ts';
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

const activeEnrolments = async () =>
  (await api.database.execute("SELECT order_id FROM enrolments WHERE status = 'active'")).rows;

const refresh = async (orderId: string) =>
  bodyOf(await learner.post(`/api/payments/${orderId}/refresh`), 200, captureResultSchema);

const askRefund = (orderId: string) => learner.post(`/api/payments/${orderId}/refund`);

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

describe('a refund PayPal accepted and later declined', () => {
  it('is read by its id: the order is paid again and a new refund goes under a new key', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.holdRefunds();
    expect((await askRefund(orderId)).status).toBe(200);
    const refundId = (await reading(orderId)).refund?.id ?? '';
    api.gateway.declineRefundAtPayPal(refundId);

    expect(await refresh(orderId)).toMatchObject({ status: 'completed', issue: null });
    expect(api.gateway.calls.refundsRead).toBe(1);
    expect(await reading(orderId)).toMatchObject({ refund: undefined, refundAttempts: 1 });
    expect(await historyOf(orderId)).toMatchObject({ refund: 'none', refundable: true });
    expect(await activeEnrolments()).toHaveLength(1);
    expect(await refresh(orderId)).toMatchObject({ status: 'completed' });
    expect(await ledgerOf(orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
      ['refund-requested', 0],
      ['refund-failed', 0],
    ]);

    api.gateway.holdRefunds();
    expect((await askRefund(orderId)).status).toBe(200);
    expect(api.gateway.refundRequests).toEqual([`refund-${orderId}`, `refund-${orderId}-2`]);
    api.gateway.refundAtPayPal((await reading(orderId)).paypalOrderId ?? '');
    expect(await refresh(orderId)).toMatchObject({ status: 'refunded' });
    expect(await sumOf(orderId)).toBe(0);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('declined at once is kept as declined, answered 502, and asked again under a new key', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.declineRefunds();
    await expectProblem(await askRefund(orderId), 502, 'payment_provider_error');
    expect(await reading(orderId)).toMatchObject({
      status: 'completed',
      refund: undefined,
      refundAttempts: 1,
    });
    await expectProblem(await askRefund(orderId), 502, 'payment_provider_error');
    expect(api.gateway.refundRequests).toEqual([`refund-${orderId}`, `refund-${orderId}-2`]);
    expect(await activeEnrolments()).toHaveLength(1);
    expect(await sumOf(orderId)).toBe(PRICE);
  });

  it('completed is read by its id and refunds the order once, however often it is read', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.holdRefunds();
    await askRefund(orderId);
    api.gateway.refundAtPayPal(paypalOrderId);
    expect(await refresh(orderId)).toMatchObject({ status: 'refunded' });
    expect(await refresh(orderId)).toMatchObject({ status: 'refunded' });
    expect(api.gateway.calls.refundsRead).toBe(1);
    expect(await sumOf(orderId)).toBe(0);
  });

  it('of a capture that did not match is asked again under a new key at the next reading', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'mismatch');
    api.gateway.holdRefunds();
    await learner.post(`/api/checkout/orders/${order.orderId}/capture`);
    api.gateway.declineRefundAtPayPal((await reading(order.orderId)).refund?.id ?? '');

    expect(await refresh(order.orderId)).toMatchObject({ status: 'pending', issue: 'mismatch' });
    expect(api.gateway.refundRequests).toEqual([
      `refund-${order.orderId}`,
      `refund-${order.orderId}-2`,
    ]);
    expect((await reading(order.orderId)).refund).toMatchObject({ status: 'pending' });
    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await sumOf(order.orderId)).toBe(0);
  });
});

describe('partial refunds made from the merchant’s PayPal account', () => {
  it('are each recorded once with their amount, and the course stays open', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    const first = api.gateway.refundPartAtPayPal(paypalOrderId, 300);
    expect(await refresh(orderId)).toMatchObject({ status: 'completed' });
    expect(await refresh(orderId)).toMatchObject({ status: 'completed' });
    api.gateway.refundPartAtPayPal(paypalOrderId, 200);
    expect(await refresh(orderId)).toMatchObject({ status: 'completed' });
    const late = await reading(orderId);
    await store.recordPaid(
      late,
      {
        reference: late.paypalCaptureId ?? '',
        amount: late.amount,
        refunds: [{ refundId: first, amount: { currency: 'USD', minorUnits: 300 } }],
      },
      'webhook',
    );

    expect(await ledgerOf(orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
      ['refund-partial', -300],
      ['refund-partial', -200],
    ]);
    expect(await activeEnrolments()).toHaveLength(1);
  });

  it('leave only what remains to give back when the capture is refunded in full later', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.refundPartAtPayPal(paypalOrderId, 300);
    await refresh(orderId);
    api.gateway.refundPartAtPayPal(paypalOrderId, 200);
    api.gateway.refundAtPayPal(paypalOrderId);

    expect(await refresh(orderId)).toMatchObject({ status: 'refunded' });
    expect(await ledgerOf(orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
      ['refund-partial', -300],
      ['refund-partial', -200],
      ['refund-completed', -(PRICE - 500)],
    ]);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('leave only what remains when the learner then asks for the guarantee', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.refundPartAtPayPal(paypalOrderId, 400);
    await refresh(orderId);
    expect((await askRefund(orderId)).status).toBe(200);
    expect(await ledgerOf(orderId)).toContainEqual(['refund-completed', -(PRICE - 400)]);
    expect(await sumOf(orderId)).toBe(0);
    expect(await activeEnrolments()).toEqual([]);
  });
});
