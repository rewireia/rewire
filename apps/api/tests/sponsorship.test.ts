import { findDemoCourse, priceOf, REGION_PROFILES } from '@rewire/content';
import {
  enrolmentListSchema,
  sponsorshipListSchema,
  sponsorshipSchema,
  type Region,
  type Sponsorship,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { anyString, bodyOf, dashboardGet, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
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
const EMPLOYER = 'payroll-manager@employer.example';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const key = createSigningKey();

let api: TestApi;
let invoicing: FakeInvoicing;
let learner: TestClient;

beforeEach(async () => {
  invoicing = createFakeInvoicing();
  api = await createTestApi({
    overrides: {
      invoicing: { eu: invoicing, us: invoicing, uk: invoicing },
      loadCertificate: key.loadCertificate,
    },
  });
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const ask = (region: Region = 'us', client = learner) =>
  client.post('/api/sponsorships', {
    courseId: COURSE_ID,
    region,
    employerEmail: EMPLOYER,
    employerName: 'Employer Ltd',
  });

const askedFor = async (region: Region = 'us') => bodyOf(await ask(region), 201, sponsorshipSchema);

const refresh = async (id: string) =>
  bodyOf(await learner.post(`/api/sponsorships/${id}/refresh`), 200, sponsorshipSchema);

/** The fake's page to pay on ends with the id of the invoice. */
const invoiceIdOf = ({ payUrl }: Sponsorship) => new URL(payUrl ?? 'about:blank').hash.slice(1);

const coursesOf = async (client = learner) =>
  (await bodyOf(await dashboardGet(client, '/api/learning'), 200, enrolmentListSchema)).enrolments;

const ledgerKinds = async () =>
  (await api.database.execute('SELECT kind FROM payment_events ORDER BY id')).rows.map(
    (row) => row['kind'],
  );

const deliver = (event: unknown) => {
  const text = JSON.stringify(event);
  const body = new TextEncoder().encode(text);
  return api.app.request('/api/webhooks/paypal', {
    method: 'POST',
    headers: headersOf(key.sign(body, WEBHOOK_ID)),
    body: text,
  });
};

describe('asking an employer to pay', () => {
  it('sends an invoice for the catalogue price in the currency of the region', async () => {
    const sponsorship = await askedFor('uk');
    expect(sponsorship).toMatchObject({
      courseId: COURSE_ID,
      courseTitle: course.title,
      amount: priceOf(course, 'GBP'),
      status: 'sent',
      paidAt: null,
    });
    const [sent] = invoicing.sent;
    expect(sent?.amount).toEqual(priceOf(course, 'GBP'));
    expect(sent?.recipientEmail).toBe(EMPLOYER);
    expect(sent?.note).toContain(REGION_PROFILES.uk.employerCase.quote);
    expect(sent?.note).toContain(REGION_PROFILES.uk.employerCase.source.url);
  });

  it('does not keep the address of the employer anywhere in the database', async () => {
    await askedFor();
    const tables = await api.database.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    const names = tables.rows.map(({ name }) => (typeof name === 'string' ? name : ''));
    expect(names).toContain('sponsorships');
    for (const name of names) {
      const rows = await api.database.execute(`SELECT * FROM "${name}"`);
      expect(JSON.stringify(rows.rows), name).not.toContain(EMPLOYER);
    }
  });

  it('answers 503 when the server has no PayPal credentials', async () => {
    await api.close();
    api = await createTestApi({ payments: false });
    await expectProblem(await ask('us', api.client()), 503, 'payments_unavailable');
  });

  it('refuses a learner who already has the course', async () => {
    await buyCourse(learner, COURSE_ID);
    await expectProblem(await ask(), 409, 'already_enrolled');
    expect(invoicing.calls.sent).toBe(0);
  });

  it('refuses while PayPal still reviews a payment of the same course', async () => {
    const order = await startOrder(learner, COURSE_ID);
    api.gateway.scriptCapture(order.paypalOrderId, 'pending');
    await learner.post(`/api/checkout/orders/${order.orderId}/capture`);
    await expectProblem(await ask(), 409, 'payment_pending');
  });

  it('refuses a second invoice for a course while the first is out', async () => {
    await askedFor();
    await expectProblem(await ask(), 409, 'invoice_pending');
    expect(invoicing.calls.sent).toBe(1);
  });

  it('keeps the learner from paying with PayPal while the invoice is out', async () => {
    await askedFor();
    const problem = await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      409,
      'invoice_pending',
    );
    expect(problem.detail).toContain('Cancel that request');
    const orders = await api.database.execute('SELECT method FROM orders');
    expect(orders.rows.map((row) => row['method'])).toEqual(['employer-invoice']);
  });

  it("answers 502 with PayPal's code when PayPal refuses, and fails the order", async () => {
    invoicing.failNext('INVALID_EMAIL_ADDRESS', 'created');
    const problem = await expectProblem(await ask(), 502, 'payment_provider_error');
    expect(problem.detail).toContain('INVALID_EMAIL_ADDRESS');
    const order = await api.database.execute('SELECT status FROM orders');
    expect(order.rows.map((row) => row['status'])).toEqual(['failed']);
    const ledger = await api.database.execute('SELECT kind, paypal_reference FROM payment_events');
    expect(ledger.rows.map((row) => [row['kind'], row['paypal_reference']])).toEqual([
      ['invoice-cancelled', 'INVALID_EMAIL_ADDRESS'],
    ]);
    // Nothing is left open: the learner may ask again.
    await bodyOf(await ask(), 201, sponsorshipSchema);
  });
});

describe('a paid invoice', () => {
  it('found by a refresh completes the order and opens the course', async () => {
    const sponsorship = await askedFor();
    invoicing.pay(invoiceIdOf(sponsorship));
    const refreshed = await refresh(sponsorship.id);
    expect(refreshed).toMatchObject({ status: 'paid', paidAt: anyString });
    const order = await api.database.execute('SELECT status FROM orders');
    expect(order.rows.map((row) => row['status'])).toEqual(['completed']);
    expect(await ledgerKinds()).toEqual(['invoice-sent', 'invoice-paid']);
    expect(await coursesOf()).toEqual([
      expect.objectContaining({ courseId: COURSE_ID, status: 'active' }),
    ]);
  });

  it('reported by a signed webhook does the same, once however often it arrives', async () => {
    const invoiceId = invoiceIdOf(await askedFor());
    invoicing.pay(invoiceId);
    const reads = invoicing.calls.read;
    const event = {
      id: 'WH-INVOICE-PAID',
      event_type: 'INVOICING.INVOICE.PAID',
      resource: { invoice: { id: invoiceId } },
    };
    expect((await deliver(event)).status).toBe(204);
    expect((await deliver(event)).status).toBe(204);
    expect(await ledgerKinds()).toEqual(['invoice-sent', 'invoice-paid']);
    expect(await coursesOf()).toHaveLength(1);
    expect(invoicing.calls.read).toBe(reads + 1);
  });

  it('is still not paid while the employer has not paid', async () => {
    const sponsorship = await askedFor();
    expect((await refresh(sponsorship.id)).status).toBe('sent');
    expect(await coursesOf()).toEqual([]);
  });
});

describe('a cancelled invoice', () => {
  it('ends the request and fails its order, without opening the course', async () => {
    const sponsorship = await askedFor();
    invoicing.cancel(invoiceIdOf(sponsorship));
    expect((await refresh(sponsorship.id)).status).toBe('cancelled');
    const order = await api.database.execute('SELECT status FROM orders');
    expect(order.rows.map((row) => row['status'])).toEqual(['failed']);
    expect(await coursesOf()).toEqual([]);
    // With the first invoice closed, the learner may ask again.
    await bodyOf(await ask(), 201, sponsorshipSchema);
  });
});

describe('the requests of a learner', () => {
  it('are listed for both signed-in demo browsers, but not for a visitor', async () => {
    const sponsorship = await askedFor();
    const list = await bodyOf(
      await dashboardGet(learner, '/api/sponsorships'),
      200,
      sponsorshipListSchema,
    );
    expect(list.sponsorships).toEqual([sponsorship]);
    await expectProblem(await api.client().get('/api/sponsorships'), 401, 'sign_in_required');
    const secondDemo = await bodyOf(
      await dashboardGet(api.client(), '/api/sponsorships'),
      200,
      sponsorshipListSchema,
    );
    expect(secondDemo.sponsorships).toEqual([sponsorship]);
  });

  it('do not exist for another learner', async () => {
    const sponsorship = await askedFor();
    const other = api.client();
    await other.put('/api/session/profile', {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
      timeByTask: {},
    });
    await expectProblem(
      await other.post(`/api/sponsorships/${sponsorship.id}/refresh`),
      404,
      'not_found',
    );
  });

  it('need a session to be refreshed', async () => {
    const sponsorship = await askedFor();
    await expectProblem(
      await api.client().post(`/api/sponsorships/${sponsorship.id}/refresh`),
      401,
      'no_session',
    );
  });
});
