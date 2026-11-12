import { sponsorshipSchema, type Sponsorship } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
import { buyCourse, createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-for-office-work';

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

const askedFor = async (client = learner) =>
  bodyOf(
    await client.post('/api/sponsorships', {
      courseId: COURSE_ID,
      region: 'us',
      employerEmail: 'payroll-manager@employer.example',
    }),
    201,
    sponsorshipSchema,
  );

const cancel = (id: string, client = learner) => client.post(`/api/sponsorships/${id}/cancel`);

/** The fake's page to pay on ends with the id of the invoice. */
const invoiceIdOf = ({ payUrl }: Sponsorship) => new URL(payUrl ?? 'about:blank').hash.slice(1);

const column = async (sql: string, name: string) =>
  (await api.database.execute(sql)).rows.map((row) => row[name]);

const enrolments = () => column('SELECT status FROM enrolments', 'status');

describe('cancelling a request', () => {
  it('cancels the invoice at PayPal, fails the order, and lets the learner pay', async () => {
    const sponsorship = await askedFor();
    const cancelled = await bodyOf(await cancel(sponsorship.id), 200, sponsorshipSchema);
    expect(cancelled).toMatchObject({ id: sponsorship.id, status: 'cancelled', paidAt: null });
    expect(invoicing.calls.cancelled).toBe(1);
    expect(await column('SELECT status FROM orders', 'status')).toEqual(['failed']);
    expect(await column('SELECT kind FROM payment_events ORDER BY id', 'kind')).toEqual([
      'invoice-sent',
      'invoice-cancelled',
    ]);
    const bought = await buyCourse(learner, COURSE_ID);
    expect(bought.captured.status).toBe('completed');
  });

  it('does not exist for another learner', async () => {
    const sponsorship = await askedFor();
    const other = api.client();
    await askedFor(other);
    await expectProblem(await cancel(sponsorship.id, other), 404, 'not_found');
    expect(invoicing.calls.cancelled).toBe(0);
  });

  it('is refused once the invoice is paid, and the course stays open', async () => {
    const sponsorship = await askedFor();
    invoicing.pay(invoiceIdOf(sponsorship));
    await bodyOf(
      await learner.post(`/api/sponsorships/${sponsorship.id}/refresh`),
      200,
      sponsorshipSchema,
    );
    await expectProblem(await cancel(sponsorship.id), 409, 'invoice_not_open');
    expect(invoicing.calls.cancelled).toBe(0);
    expect(await enrolments()).toEqual(['active']);
  });

  it('records an invoice found paid at that moment, instead of cancelling it', async () => {
    const sponsorship = await askedFor();
    invoicing.pay(invoiceIdOf(sponsorship));
    await expectProblem(await cancel(sponsorship.id), 409, 'invoice_not_open');
    expect(invoicing.calls.cancelled).toBe(0);
    expect(await column('SELECT status FROM sponsorships', 'status')).toEqual(['paid']);
    expect(await column('SELECT status FROM orders', 'status')).toEqual(['completed']);
    expect(await enrolments()).toEqual(['active']);
  });

  it('answers 502 when PayPal refuses, and the request stays out', async () => {
    const sponsorship = await askedFor();
    invoicing.failNext('INTERNAL_SERVER_ERROR', 'cancelled');
    const problem = await expectProblem(
      await cancel(sponsorship.id),
      502,
      'payment_provider_error',
    );
    expect(problem.detail).toContain('INTERNAL_SERVER_ERROR');
    expect(await column('SELECT status FROM sponsorships', 'status')).toEqual(['sent']);
    expect(await column('SELECT status FROM orders', 'status')).toEqual(['created']);
  });
});
