import { sponsorshipSchema, type PlannedCourse, type StudyTimeline } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
import { courseOf, coursesOf, PAID, readTimeline, savePlan, TODAY } from './support/study-plan.ts';
import { buyCourse, createTestApi, startOrder, type TestApi } from './support/test-api.ts';

/** A plan begun six weeks ago: the day of its first paid course is long past. */
const BEGUN_LONG_AGO = { startsOn: '2026-09-30' };

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

const paidCourse = (timeline: StudyTimeline) => courseOf(timeline, PAID);

/** The course that comes right after another in the plan. */
const after = (timeline: StudyTimeline, courseId: string): PlannedCourse => {
  const courses = coursesOf(timeline);
  const next = courses[courses.findIndex((course) => course.id === courseId) + 1];
  if (next === undefined) {
    throw new Error(`no course follows ${courseId}`);
  }
  return next;
};

const dayAfter = (day: string) =>
  new Date(Date.parse(day) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('a paid course and its payment', () => {
  it('shows its price and that nothing is paid, to a visitor too', async () => {
    const course = paidCourse(await readTimeline(learner));
    expect(course).toMatchObject({
      price: { currency: 'USD', minorUnits: 1900 },
      payment: 'due',
      paidOn: null,
    });
    // Its day is still to come, so no payment is holding it.
    expect(course.booking?.heldByPayment).toBe(false);
  });

  it('waits for today once its day has come unpaid, and holds what follows', async () => {
    const timeline = await savePlan(learner, BEGUN_LONG_AGO);
    const course = paidCourse(timeline);
    expect(course.booking).toMatchObject({ startsOn: TODAY, heldByPayment: true });
    expect(after(timeline, PAID).booking?.startsOn).toBe(dayAfter(course.booking?.endsOn ?? ''));

    // It moves with the calendar for as long as it stays unpaid.
    api.clock.advanceDays(3);
    expect(paidCourse(await readTimeline(learner)).booking?.startsOn).toBe('2026-11-14');
  });

  it('starts the day it is paid for when the payment comes late, and stays there', async () => {
    await savePlan(learner, BEGUN_LONG_AGO);
    await buyCourse(learner, PAID);
    const paid = paidCourse(await readTimeline(learner));
    expect(paid).toMatchObject({ payment: 'paid', paidOn: TODAY, enrolment: 'active' });
    expect(paid.booking).toMatchObject({ startsOn: TODAY, heldByPayment: true });

    api.clock.advanceDays(10);
    expect(paidCourse(await readTimeline(learner)).booking?.startsOn).toBe(TODAY);
  });

  it('is not held when it is paid for before its day', async () => {
    await buyCourse(learner, PAID);
    const timeline = await readTimeline(learner);
    expect(paidCourse(timeline)).toMatchObject({ payment: 'paid', paidOn: TODAY });
    expect(paidCourse(timeline).booking?.heldByPayment).toBe(false);
    expect(coursesOf(timeline).every((course) => course.booking?.heldByPayment === false)).toBe(
      true,
    );
  });

  it('goes back to waiting when the payment is refunded', async () => {
    await savePlan(learner, BEGUN_LONG_AGO);
    const { orderId } = await buyCourse(learner, PAID);
    api.clock.advanceDays(2);
    expect((await learner.post(`/api/payments/${orderId}/refund`)).status).toBe(200);

    const course = paidCourse(await readTimeline(learner));
    expect(course).toMatchObject({ payment: 'refunded', paidOn: null, enrolment: 'none' });
    expect(course.booking).toMatchObject({ startsOn: '2026-11-13', heldByPayment: true });
  });

  it('says so while PayPal holds the payment for review, and opens when it is released', async () => {
    await savePlan(learner, BEGUN_LONG_AGO);
    const order = await startOrder(learner, PAID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    await learner.post(`/api/checkout/orders/${order.orderId}/capture`);
    expect(paidCourse(await readTimeline(learner))).toMatchObject({
      payment: 'held-by-paypal',
      enrolment: 'payment-pending',
    });

    api.clock.advanceDays(1);
    api.gateway.release(order.paypalOrderId);
    await learner.post(`/api/payments/${order.orderId}/refresh`);
    const released = paidCourse(await readTimeline(learner));
    expect(released).toMatchObject({ payment: 'paid', paidOn: '2026-11-12' });
    expect(released.booking?.startsOn).toBe('2026-11-12');
  });

  it('waits for the employer to pay the invoice, and opens the day they do', async () => {
    await savePlan(learner, BEGUN_LONG_AGO);
    const sponsorship = await bodyOf(
      await learner.post('/api/sponsorships', {
        courseId: PAID,
        region: 'us',
        employerEmail: 'payroll-manager@employer.example',
        employerName: 'Employer Ltd',
      }),
      201,
      sponsorshipSchema,
    );
    expect(paidCourse(await readTimeline(learner))).toMatchObject({
      payment: 'invoice-sent',
      booking: { startsOn: TODAY, heldByPayment: true },
    });

    api.clock.advanceDays(5);
    invoicing.pay(new URL(sponsorship.payUrl ?? 'about:blank').hash.slice(1));
    await learner.post(`/api/sponsorships/${sponsorship.id}/refresh`);
    expect(paidCourse(await readTimeline(learner))).toMatchObject({
      payment: 'paid',
      paidOn: '2026-11-16',
      booking: { startsOn: '2026-11-16', heldByPayment: true },
    });
  });

  it('is not counted as paid by a checkout opened and never approved', async () => {
    await startOrder(learner, PAID);
    expect(paidCourse(await readTimeline(learner)).payment).toBe('due');
  });
});
