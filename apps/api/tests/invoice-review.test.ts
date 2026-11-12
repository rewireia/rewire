import { findDemoCourse, priceOf } from '@rewire/content';
import { sponsorshipSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { InvoiceStanding, InvoicingGateway } from '../src/modules/sponsorship/invoicing.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-for-office-work';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const PRICE = priceOf(course, 'USD').minorUnits;
const PRICE_TEXT = (PRICE / 100).toFixed(2);

let api: TestApi;
let invoicing: FakeInvoicing;
let learner: TestClient;
/** Changes what PayPal reports of an invoice, as an edit at PayPal would. */
let tamper: (standing: InvoiceStanding) => InvoiceStanding;

beforeEach(async () => {
  invoicing = createFakeInvoicing();
  tamper = (standing) => standing;
  const gateway: InvoicingGateway = {
    nextNumber: () => invoicing.nextNumber(),
    createDraft: (request) => invoicing.createDraft(request),
    sendDraft: (invoiceId, orderId) => invoicing.sendDraft(invoiceId, orderId),
    readInvoice: async (invoiceId) => tamper(await invoicing.readInvoice(invoiceId)),
    findByReference: (orderId) => invoicing.findByReference(orderId),
    cancelInvoice: (invoiceId) => invoicing.cancelInvoice(invoiceId),
  };
  api = await createTestApi({
    overrides: { invoicing: { eu: gateway, us: gateway, uk: gateway } },
  });
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const askEmployer = async () =>
  bodyOf(
    await learner.post('/api/sponsorships', {
      courseId: COURSE_ID,
      region: 'us',
      employerEmail: 'payroll@employer.example',
    }),
    201,
    sponsorshipSchema,
  );

const refresh = async (id: string) =>
  bodyOf(await learner.post(`/api/sponsorships/${id}/refresh`), 200, sponsorshipSchema);

const ledger = async () =>
  (
    await api.database.execute(
      'SELECT kind, amount_minor, currency, paypal_reference FROM payment_events ORDER BY id',
    )
  ).rows.map((row) => [row['kind'], row['amount_minor'], row['currency']]);

const orderRow = async () =>
  (
    await api.database.execute(
      `SELECT status, review_reason, observed_status, observed_currency, observed_value
         FROM orders`,
    )
  ).rows.map((row) => Object.values(row))[0];

const activeEnrolments = async () =>
  (await api.database.execute("SELECT id FROM enrolments WHERE status = 'active'")).rows;

const holds = async () => (await api.database.execute('SELECT order_id FROM purchase_holds')).rows;

/** The request is in review: nothing opened, the course held, the facts kept as received. */
const expectInReview = async (id: string, reason: string, observed: unknown[]) => {
  expect(await refresh(id)).toMatchObject({ status: 'sent', inReview: true, paidAt: null });
  expect(await orderRow()).toEqual(['pending', reason, ...observed]);
  expect(await ledger()).toEqual([
    ['invoice-sent', 0, 'USD'],
    ['invoice-review', 0, 'USD'],
  ]);
  expect(await activeEnrolments()).toEqual([]);
  expect(await holds()).toHaveLength(1);
  await expectProblem(
    await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
    409,
    'payment_pending',
  );
};

describe('an invoice PayPal reports paid', () => {
  it('opens the course only when paid in full, in the currency of the order, and records it', async () => {
    const asked = await askEmployer();
    invoicing.pay(invoicing.ids[0] ?? '');
    expect(await refresh(asked.id)).toMatchObject({ status: 'paid', inReview: false });
    expect(await ledger()).toEqual([
      ['invoice-sent', 0, 'USD'],
      ['invoice-paid', PRICE, 'USD'],
    ]);
    expect(await activeEnrolments()).toHaveLength(1);
  });

  it.each([
    ['in another currency and amount', 'PAID', 'EUR', '0.01', 'AMOUNT_MISMATCH'],
    ['for another amount, after an adjustment', 'PAID', 'USD', '1.00', 'AMOUNT_MISMATCH'],
    ['in a currency Rewire does not sell in', 'PAID', 'JPY', '3000', 'UNREADABLE_PAYMENT'],
    ['in part', 'PARTIALLY_PAID', 'USD', '5.00', 'INVOICE_PARTIALLY_PAID'],
    ['marked as paid by hand', 'MARKED_AS_PAID', 'USD', PRICE_TEXT, 'INVOICE_MARKED_AS_PAID'],
  ])('%s opens nothing and waits in review', async (_, status, currency, value, reason) => {
    const asked = await askEmployer();
    invoicing.payAs(invoicing.ids[0] ?? '', { status, currency, value });
    await expectInReview(asked.id, reason, [status, currency, value]);
    expect(await refresh(asked.id)).toMatchObject({ inReview: true });
    expect(await ledger()).toHaveLength(2);
  });

  it('with another reference than our order opens nothing', async () => {
    const asked = await askEmployer();
    invoicing.pay(invoicing.ids[0] ?? '');
    tamper = (standing) => ({ ...standing, reference: 'another-order' });
    await expectInReview(asked.id, 'REFERENCE_MISMATCH', ['PAID', 'USD', PRICE_TEXT]);
  });

  it('opens the course once a payment in part is completed in full', async () => {
    const asked = await askEmployer();
    const invoiceId = invoicing.ids[0] ?? '';
    invoicing.payAs(invoiceId, { status: 'PARTIALLY_PAID', currency: 'USD', value: '5.00' });
    expect(await refresh(asked.id)).toMatchObject({ inReview: true });
    invoicing.pay(invoiceId);
    expect(await refresh(asked.id)).toMatchObject({ status: 'paid', inReview: false });
    expect(await ledger()).toEqual([
      ['invoice-sent', 0, 'USD'],
      ['invoice-review', 0, 'USD'],
      ['invoice-paid', PRICE, 'USD'],
    ]);
    expect(await activeEnrolments()).toHaveLength(1);
  });

  it('in review cannot be withdrawn: money may have been paid', async () => {
    const asked = await askEmployer();
    invoicing.payAs(invoicing.ids[0] ?? '', { status: 'PAID', currency: 'EUR', value: '0.01' });
    await refresh(asked.id);
    await expectProblem(
      await learner.post(`/api/sponsorships/${asked.id}/cancel`),
      409,
      'invoice_not_open',
    );
    expect(invoicing.calls.cancelled).toBe(0);
  });
});
