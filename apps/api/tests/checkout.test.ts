import { dashboardGet } from './support/client.ts';
import { findDemoCourse, priceOf } from '@rewire/content';
import {
  captureResultSchema,
  enrolmentListSchema,
  paymentConfigSchema,
  paymentListSchema,
  startedOrderSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { anyString, bodyOf, type TestClient } from './support/client.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  startOrder,
  type TestApi,
} from './support/test-api.ts';

const COURSE_ID = 'ai-for-office-work';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const capture = async (orderId: string, client = learner) =>
  bodyOf(await client.post(`/api/checkout/orders/${orderId}/capture`), 200, captureResultSchema);

const activeCourses = async (client = learner) =>
  (
    await bodyOf(await dashboardGet(client, '/api/learning'), 200, enrolmentListSchema)
  ).enrolments.map((enrolment) => enrolment.courseId);

const ledger = async (orderId: string) =>
  (
    await api.database.execute(
      'SELECT kind, amount_minor FROM payment_events WHERE order_id = ? ORDER BY id',
      [orderId],
    )
  ).rows.map((row) => ({ kind: row['kind'], amount: row['amount_minor'] }));

describe('payment configuration', () => {
  it('gives the browser the public client id and the currency of the region', async () => {
    const config = await bodyOf(
      await learner.get('/api/regions/uk/payment-config'),
      200,
      paymentConfigSchema,
    );
    expect(config).toEqual({
      available: true,
      environment: 'sandbox',
      clientId: 'test-client',
      currency: 'GBP',
    });
  });

  it('says plainly when PayPal is not set up', async () => {
    await api.close();
    api = await createTestApi({ payments: false });
    const config = await bodyOf(
      await api.client().get('/api/regions/us/payment-config'),
      200,
      paymentConfigSchema,
    );
    expect(config.available).toBe(false);
  });
});

describe('opening an order', () => {
  it('charges the catalogue price in the currency of the region, whatever the browser sends', async () => {
    const response = await learner.post('/api/checkout/orders', {
      courseId: COURSE_ID,
      region: 'uk',
      amount: { currency: 'GBP', minorUnits: 1 },
    });
    const order = await bodyOf(response, 201, startedOrderSchema);
    expect(order.amount).toEqual(priceOf(course, 'GBP'));
    expect(learner.cookie).toBeDefined();
  });

  it('refuses a course that is not in the catalogue', async () => {
    await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: 'no-such-course', region: 'us' }),
      404,
      'not_found',
    );
  });

  it('refuses a learner who already has the course', async () => {
    await buyCourse(learner, COURSE_ID);
    await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      409,
      'already_enrolled',
    );
  });

  it('refuses a second order while PayPal still reviews the first one', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    await capture(order.orderId);
    const problem = await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      409,
      'payment_pending',
    );
    expect(problem.detail).toBe('PayPal is still reviewing your earlier payment for this course.');
    expect(api.gateway.calls.opened).toBe(1);
  });

  it('answers 503 when the server has no PayPal credentials', async () => {
    await api.close();
    api = await createTestApi({ payments: false });
    await expectProblem(
      await api.client().post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      503,
      'payments_unavailable',
    );
  });
});

describe('capturing an order', () => {
  it('completes the order and opens the course', async () => {
    const order = await startOrder(learner, COURSE_ID);
    expect(await capture(order.orderId)).toEqual({
      orderId: order.orderId,
      status: 'completed',
      courseId: COURSE_ID,
      issue: null,
    });
    expect(await activeCourses()).toEqual([COURSE_ID]);
  });

  it('records a capture once, however many times it is asked for', async () => {
    const order = await startOrder(learner, COURSE_ID);
    await capture(order.orderId);
    await capture(order.orderId);
    expect(await ledger(order.orderId)).toEqual([
      { kind: 'order-opened', amount: 0 },
      { kind: 'capture-completed', amount: priceOf(course, 'USD').minorUnits },
    ]);
    const enrolments = await api.database.execute('SELECT id FROM enrolments');
    expect(enrolments.rows).toHaveLength(1);
  });

  it('gives no access while PayPal holds the money, and a later refresh completes it', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    expect(await capture(order.orderId)).toMatchObject({
      status: 'pending',
      issue: 'held-by-paypal',
    });
    expect(await activeCourses()).toEqual([]);

    api.gateway.release(order.paypalOrderId);
    const refreshed = await bodyOf(
      await learner.post(`/api/payments/${order.orderId}/refresh`),
      200,
      captureResultSchema,
    );
    expect(refreshed).toMatchObject({ status: 'completed', issue: null });
    expect(await activeCourses()).toEqual([COURSE_ID]);
  });

  it('refunds a capture of another amount, and enrols nobody', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'mismatch');
    expect(await capture(order.orderId)).toMatchObject({ status: 'refunded', issue: 'mismatch' });
    expect(await activeCourses()).toEqual([]);
  });

  it('says the buyer has not approved the order yet, and changes nothing', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'not-approved');
    expect(await capture(order.orderId)).toMatchObject({
      status: 'created',
      issue: 'not-approved',
    });
  });

  it('fails an order the bank declined', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'declined');
    expect(await capture(order.orderId)).toMatchObject({ status: 'failed', issue: 'declined' });
  });

  it("does not show one learner's order to another", async () => {
    const order = await startOrder(learner, COURSE_ID);
    const other = api.client();
    await other.put('/api/session/profile', {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
      timeByTask: {},
    });
    await expectProblem(
      await other.post(`/api/checkout/orders/${order.orderId}/capture`),
      404,
      'not_found',
    );
  });

  it('needs the session that opened the order', async () => {
    const order = await startOrder(learner, COURSE_ID);
    await expectProblem(
      await api.client().post(`/api/checkout/orders/${order.orderId}/capture`),
      401,
      'no_session',
    );
  });
});

describe('refunds', () => {
  it('give the money back within the window and close the course', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    api.clock.advanceDays(13);
    const refunded = await bodyOf(
      await learner.post(`/api/payments/${orderId}/refund`),
      200,
      captureResultSchema,
    );
    expect(refunded.status).toBe('refunded');
    expect(await activeCourses()).toEqual([]);
    expect((await ledger(orderId)).at(-1)).toEqual({
      kind: 'refund-completed',
      amount: -priceOf(course, 'USD').minorUnits,
    });
  });

  it('are refused after 14 days', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    api.clock.advanceDays(15);
    await expectProblem(
      await learner.post(`/api/payments/${orderId}/refund`),
      409,
      'refund_not_allowed',
    );
  });

  it('leave the course open while PayPal holds the refund, and close it once PayPal is done', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    api.gateway.holdRefunds();
    const held = await bodyOf(
      await learner.post(`/api/payments/${orderId}/refund`),
      200,
      captureResultSchema,
    );
    expect(held).toEqual({
      orderId,
      status: 'completed',
      courseId: COURSE_ID,
      issue: 'held-by-paypal',
    });
    expect(await activeCourses()).toEqual([COURSE_ID]);
    expect((await ledger(orderId)).map((row) => row.kind)).not.toContain('refund-completed');

    api.gateway.refundAtPayPal(paypalOrderId);
    const refreshed = await bodyOf(
      await learner.post(`/api/payments/${orderId}/refresh`),
      200,
      captureResultSchema,
    );
    expect(refreshed.status).toBe('refunded');
    expect(await activeCourses()).toEqual([]);
  });

  it('let the learner buy the course again, which opens it again', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    await learner.post(`/api/payments/${orderId}/refund`);
    const again = await buyCourse(learner, COURSE_ID);
    expect(again.captured.status).toBe('completed');
    expect(await activeCourses()).toEqual([COURSE_ID]);
  });
});

describe('the payment history', () => {
  it('is empty for a visitor, and states the refund window', async () => {
    const list = await bodyOf(await dashboardGet(learner, '/api/payments'), 200, paymentListSchema);
    expect(list).toEqual({ payments: [], refundWindowDays: 14 });
  });

  it('lists what was paid, leaving out orders never approved', async () => {
    await startOrder(learner, 'ai-foundations');
    const { orderId, captured } = await buyCourse(learner, COURSE_ID);
    expect(captured.status).toBe('completed');
    const list = await bodyOf(await dashboardGet(learner, '/api/payments'), 200, paymentListSchema);
    expect(list.payments).toEqual([
      expect.objectContaining({
        orderId,
        courseId: COURSE_ID,
        courseTitle: course.title,
        method: 'paypal',
        amount: priceOf(course, 'USD'),
        status: 'completed',
        refundable: true,
        paypalReference: anyString,
      }),
    ]);
  });
});
