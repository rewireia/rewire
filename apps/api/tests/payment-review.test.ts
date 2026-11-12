import { findDemoCourse, priceOf } from '@rewire/content';
import { captureResultSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createOrderStore, type OrderStore } from '../src/modules/checkout/order-store.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, startOrder, type TestApi } from './support/test-api.ts';

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

const reading = async (orderId: string) => {
  const order = await store.find(orderId);
  if (order === undefined) {
    throw new Error(`no order ${orderId}`);
  }
  return order;
};

const buyAgain = () => learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' });

describe('a capture PayPal reports in a way Rewire cannot read', () => {
  it('is kept in review with its id and what PayPal sent, holds the course and gives no access', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'unreadable');
    expect(await capture(order.orderId)).toMatchObject({
      status: 'pending',
      issue: 'needs-review',
    });

    expect(await reading(order.orderId)).toMatchObject({
      status: 'pending',
      paypalCaptureId: expect.stringMatching(/^CAPTURE-/) as unknown,
      review: {
        reason: 'UNREADABLE_CAPTURE',
        status: 'COMPLETED',
        currency: 'JPY',
        value: '100',
      },
    });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-review', 0],
    ]);
    expect(await activeEnrolments()).toEqual([]);
    expect(await holdsOf()).toEqual([order.orderId]);
    await expectProblem(await buyAgain(), 409, 'payment_pending');
    await expectProblem(
      await learner.post(`/api/payments/${order.orderId}/refund`),
      409,
      'refund_not_allowed',
    );
  });

  it('stays in review at every reading until PayPal reports it clearly, then is paid once', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'unreadable');
    await capture(order.orderId);
    expect(await refresh(order.orderId)).toMatchObject({ issue: 'needs-review' });
    expect(await ledgerOf(order.orderId)).toHaveLength(2);

    api.gateway.release(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'completed', issue: null });
    expect(await refresh(order.orderId)).toMatchObject({ status: 'completed', issue: null });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-review', 0],
      ['capture-completed', PRICE],
    ]);
    expect(await activeEnrolments()).toHaveLength(1);
  });

  it('is refunded when PayPal reports it refunded, with what PayPal says it took', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'unreadable');
    await capture(order.orderId);
    api.gateway.refundAtPayPal(order.paypalOrderId);

    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['capture-review', 0],
      ['capture-completed', PRICE],
      ['refund-completed', -PRICE],
    ]);
    expect(await holdsOf()).toEqual([]);
    expect(await activeEnrolments()).toEqual([]);
  });

  it('never makes a paid order unpaid: a later reading in review leaves it as it is', async () => {
    const order = await startOrder(learner, COURSE_ID);
    await capture(order.orderId);
    const paid = await reading(order.orderId);
    const observed = { status: 'SETTLING', currency: 'USD', value: '19.00' };
    await store.recordReview(
      paid,
      { reference: 'X', reason: 'UNKNOWN_STATUS', observed },
      'webhook',
    );
    expect(await reading(order.orderId)).toMatchObject({ status: 'completed', review: undefined });
    expect(await activeEnrolments()).toHaveLength(1);
  });
});

describe('a capture whose first news is that it was already refunded', () => {
  /** The capture is made at PayPal, but its answer never reaches Rewire. */
  const lostCapture = async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.loseNextCapture(true);
    await expectProblem(
      await learner.post(`/api/checkout/orders/${order.orderId}/capture`),
      502,
      'payment_provider_error',
    );
    return order;
  };

  const expectRefundedWhole = async (orderId: string) => {
    const refunded = await reading(orderId);
    expect(refunded).toMatchObject({
      status: 'refunded',
      paypalCaptureId: expect.stringMatching(/^CAPTURE-/) as unknown,
      capturedAmount: { currency: 'USD', minorUnits: PRICE },
    });
    expect(await ledgerOf(orderId)).toEqual([
      ['order-opened', 0],
      ['capture-completed', PRICE],
      ['refund-completed', -PRICE],
    ]);
    expect(await holdsOf()).toEqual([]);
    expect(await activeEnrolments()).toEqual([]);
  };

  it('is refunded with its id and both rows when the answer of the capture was lost', async () => {
    const order = await lostCapture();
    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded', issue: null });
    await expectRefundedWhole(order.orderId);
    expect((await buyAgain()).status).toBe(201);
  });

  it('ends the same however often, and by whichever route, it is reported', async () => {
    const order = await lostCapture();
    api.gateway.refundAtPayPal(order.paypalOrderId);
    const before = await reading(order.orderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await capture(order.orderId)).toMatchObject({ status: 'refunded' });
    await store.recordRefunded(before, 'webhook', {
      captureId: (await reading(order.orderId)).paypalCaptureId ?? '',
      amount: before.amount,
      refunds: [],
      mismatch: false,
    });
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    await expectRefundedWhole(order.orderId);
  });

  it('is refunded the same when the learner closed the tab before the capture', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.captureAtPayPal(order.paypalOrderId);
    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await capture(order.orderId)).toMatchObject({ status: 'refunded', issue: null });
    await expectRefundedWhole(order.orderId);
  });

  it('records the partial refunds PayPal lists and gives back only what they left', async () => {
    const order = await lostCapture();
    const part = api.gateway.refundPartAtPayPal(order.paypalOrderId, 500);
    api.gateway.refundAtPayPal(order.paypalOrderId);
    expect(await refresh(order.orderId)).toMatchObject({ status: 'refunded' });
    expect(await ledgerOf(order.orderId)).toEqual([
      ['order-opened', 0],
      ['refund-partial', -500],
      ['capture-completed', PRICE],
      ['refund-completed', -(PRICE - 500)],
    ]);
    const rows = await api.database.execute(
      "SELECT paypal_reference FROM payment_events WHERE kind = 'refund-partial'",
    );
    expect(rows.rows.map((row) => row['paypal_reference'])).toEqual([part]);
  });
});
