import { findDemoCourse, priceOf } from '@rewire/content';
import {
  captureResultSchema,
  problemSchema,
  sponsorshipSchema,
  startedOrderSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
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
const PRICE = priceOf(course, 'USD').minorUnits;

let api: TestApi;
let invoicing: FakeInvoicing;
let learner: TestClient;

beforeEach(async () => {
  invoicing = createFakeInvoicing();
  api = await createTestApi({
    overrides: { invoicing: { eu: invoicing, us: invoicing, uk: invoicing } },
  });
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const capture = (orderId: string) => learner.post(`/api/checkout/orders/${orderId}/capture`);
const open = () => learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' });
const ask = () =>
  learner.post('/api/sponsorships', {
    courseId: COURSE_ID,
    region: 'us',
    employerEmail: 'payroll-manager@employer.example',
  });

/** What the learner was charged in all, by the ledger: money in less money back. */
const charged = async () => {
  const result = await api.database.execute(
    'SELECT COALESCE(SUM(amount_minor), 0) AS total FROM payment_events',
  );
  return result.rows[0]?.['total'];
};

const paidOrders = async () =>
  (await api.database.execute("SELECT id FROM orders WHERE status = 'completed'")).rows.map(
    (row) => row['id'],
  );

const codeOf = async (response: Response) =>
  response.status === 200
    ? captureResultSchema.parse(await response.json()).status
    : problemSchema.parse(await response.json()).code;

describe('one attempt to pay per course', () => {
  it('lets only one of two orders opened at once be captured', async () => {
    // The learner has a session already, as one who has saved their occupation does.
    await learner.put('/api/session/profile', {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
      timeByTask: {},
    });
    const [first, second] = await Promise.all([startOrder(learner, COURSE_ID), open()]);
    const other = await bodyOf(second, 201, startedOrderSchema);
    const answers = await Promise.all([capture(first.orderId), capture(other.orderId)]);
    const codes = await Promise.all(answers.map(codeOf));
    expect(codes.filter((code) => code === 'completed')).toHaveLength(1);
    expect(codes.find((code) => code !== 'completed')).toMatch(
      /^(payment_in_progress|already_enrolled)$/,
    );
    expect(api.gateway.calls.captured).toBe(1);
    expect(await paidOrders()).toHaveLength(1);
    expect(await charged()).toBe(PRICE);
  });

  it('charges once when two tabs each open and capture an order', async () => {
    const firstTab = await startOrder(learner, COURSE_ID);
    const secondTab = await startOrder(learner, COURSE_ID);
    await bodyOf(await capture(firstTab.orderId), 200, captureResultSchema);
    const problem = await expectProblem(await capture(secondTab.orderId), 409, 'already_enrolled');
    expect(problem.detail).toBe('You already have this course.');
    expect(api.gateway.calls.captured).toBe(1);
    expect(await paidOrders()).toEqual([firstTab.orderId]);
    expect(await charged()).toBe(PRICE);
  });

  it('does not capture an older order once a newer one has paid for the course', async () => {
    const older = await startOrder(learner, COURSE_ID);
    await buyCourse(learner, COURSE_ID);
    await expectProblem(await capture(older.orderId), 409, 'already_enrolled');
    expect(api.gateway.calls.captured).toBe(1);
    expect(await charged()).toBe(PRICE);
  });

  it('is not held by an order opened and abandoned', async () => {
    await startOrder(learner, COURSE_ID);
    const bought = await buyCourse(learner, COURSE_ID);
    expect(bought.captured.status).toBe('completed');
  });

  it('is not held by an order opened and abandoned when the employer is asked to pay', async () => {
    await startOrder(learner, COURSE_ID);
    expect((await bodyOf(await ask(), 201, sponsorshipSchema)).status).toBe('sent');
  });

  it('is held by a capture PayPal left unanswered, until PayPal says nothing was taken', async () => {
    const first = await startOrder(learner, COURSE_ID);
    api.gateway.loseNextCapture(false);
    await expectProblem(await capture(first.orderId), 502, 'payment_provider_error');
    await expectProblem(await open(), 409, 'payment_in_progress');

    api.clock.advanceDays(1);
    const second = await buyCourse(learner, COURSE_ID);
    expect(second.captured.status).toBe('completed');
    await expectProblem(await capture(first.orderId), 409, 'already_enrolled');
    expect(await paidOrders()).toEqual([second.orderId]);
    expect(await charged()).toBe(PRICE);
  });

  it('records a capture PayPal took without answering, and opens no other order', async () => {
    const first = await startOrder(learner, COURSE_ID);
    api.gateway.loseNextCapture(true);
    await expectProblem(await capture(first.orderId), 502, 'payment_provider_error');

    api.clock.advanceDays(1);
    await expectProblem(await open(), 409, 'already_enrolled');
    expect(await paidOrders()).toEqual([first.orderId]);
    expect(await charged()).toBe(PRICE);
  });

  it('can be bought again with a new order after a refund, and the refunded one stays refunded', async () => {
    const refunded = await buyCourse(learner, COURSE_ID);
    await bodyOf(
      await learner.post(`/api/payments/${refunded.orderId}/refund`),
      200,
      captureResultSchema,
    );
    const again = await buyCourse(learner, COURSE_ID);
    expect(again.captured.status).toBe('completed');
    expect(await codeOf(await capture(refunded.orderId))).toBe('refunded');
    const enrolment = await api.database.execute('SELECT order_id, status FROM enrolments');
    expect(enrolment.rows.map((row) => [row['order_id'], row['status']])).toEqual([
      [again.orderId, 'active'],
    ]);
    expect(api.gateway.calls.captured).toBe(2);
    expect(await charged()).toBe(PRICE);
  });
});

describe('a PayPal payment and an invoice of the same course', () => {
  it('refuses to capture an order once an invoice for the course is out', async () => {
    const order = await startOrder(learner, COURSE_ID);
    await bodyOf(await ask(), 201, sponsorshipSchema);
    await expectProblem(await capture(order.orderId), 409, 'invoice_pending');
    expect(api.gateway.calls.captured).toBe(0);
  });

  it('refuses an invoice once the course is paid with PayPal, and sends nothing', async () => {
    await buyCourse(learner, COURSE_ID);
    await expectProblem(await ask(), 409, 'already_enrolled');
    expect(invoicing.calls.created).toBe(0);
  });

  it('lets only one of a capture and an invoice asked at once go ahead', async () => {
    const order = await startOrder(learner, COURSE_ID);
    const [captured, asked] = await Promise.all([capture(order.orderId), ask()]);
    const outcomes = [captured.status, asked.status].toSorted();
    expect(outcomes).toEqual(captured.status === 200 ? [200, 409] : [201, 409]);
    expect(api.gateway.calls.captured + invoicing.sent.length).toBe(1);
  });
});
