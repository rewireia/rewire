import { dashboardGet } from './support/client.ts';
import {
  enrolmentListSchema,
  sponsorshipListSchema,
  sponsorshipSchema,
  type Sponsorship,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { anyString, bodyOf, type TestClient } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  WEBHOOK_ID,
  type TestApi,
} from './support/test-api.ts';
import { createSigningKey, headersOf } from './support/webhooks.ts';

const COURSE_ID = 'ai-for-office-work';
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

const ask = () =>
  learner.post('/api/sponsorships', {
    courseId: COURSE_ID,
    region: 'us',
    employerEmail: 'payroll-manager@employer.example',
  });

/** The one request of the learner, as the dashboard lists it. */
const theRequest = async (): Promise<Sponsorship> => {
  const list = await bodyOf(
    await dashboardGet(learner, '/api/sponsorships'),
    200,
    sponsorshipListSchema,
  );
  expect(list.sponsorships).toHaveLength(1);
  const [request] = list.sponsorships;
  if (request === undefined) {
    throw new Error('no request');
  }
  return request;
};

const refresh = async (id: string) =>
  bodyOf(await learner.post(`/api/sponsorships/${id}/refresh`), 200, sponsorshipSchema);

const stored = async () =>
  (await api.database.execute('SELECT status, invoice_id FROM sponsorships')).rows.map((row) => [
    row['status'],
    row['invoice_id'],
  ]);

const courses = async () =>
  (await bodyOf(await dashboardGet(learner, '/api/learning'), 200, enrolmentListSchema)).enrolments;

/** The only invoice PayPal holds. */
const theInvoice = () => {
  expect(invoicing.ids).toHaveLength(1);
  return invoicing.ids[0] ?? '';
};

/** A signed invoice event of PayPal. */
const notify = async (type: string, invoice: { id: string; detail?: { reference: string } }) => {
  const text = JSON.stringify({
    id: `WH-${type}-${invoice.id}`,
    event_type: `INVOICING.INVOICE.${type}`,
    resource: { invoice },
  });
  const response = await api.app.request('/api/webhooks/paypal', {
    method: 'POST',
    headers: headersOf(key.sign(new TextEncoder().encode(text), WEBHOOK_ID)),
    body: text,
  });
  expect(response.status).toBe(204);
};

describe('an invoice whose creation PayPal did not confirm', () => {
  it('is found by its reference, sent as asked, and paid like any other', async () => {
    invoicing.loseNextAnswer('created');
    const problem = await expectProblem(await ask(), 502, 'payment_provider_error');
    expect(problem.detail).toContain('asks PayPal again');
    expect(await stored()).toEqual([['unconfirmed', null]]);
    expect(invoicing.sent).toHaveLength(0);

    const request = await theRequest();
    expect(request).toMatchObject({ status: 'sent', payUrl: null });
    expect((await refresh(request.id)).payUrl).toContain(theInvoice());
    expect(invoicing.sent).toHaveLength(1);
    invoicing.pay(theInvoice());
    expect((await refresh(request.id)).status).toBe('paid');
    expect(await courses()).toHaveLength(1);
  });

  it('when the server stopped after creating it, is followed up before a new request', async () => {
    invoicing.stopAfterNext('created');
    expect((await ask()).status).toBe(500);
    expect(await stored()).toEqual([['sending', null]]);

    await expectProblem(await ask(), 409, 'invoice_pending');
    expect(await stored()).toEqual([['sent', theInvoice()]]);
    expect(invoicing.sent).toHaveLength(1);
  });

  it('when PayPal has no trace of it, is closed once PayPal had time to answer', async () => {
    invoicing.dropNext('created');
    await expectProblem(await ask(), 502, 'payment_provider_error');
    await expectProblem(await ask(), 409, 'invoice_pending');

    api.clock.advanceDays(1);
    expect((await bodyOf(await ask(), 201, sponsorshipSchema)).status).toBe('sent');
    const statuses = await api.database.execute('SELECT status FROM sponsorships ORDER BY rowid');
    expect(statuses.rows.map((row) => row['status'])).toEqual(['refused', 'sent']);
    expect(invoicing.sent).toHaveLength(1);
  });

  it('is withdrawn without being sent when the learner cancels it', async () => {
    invoicing.loseNextAnswer('created');
    await ask();
    const cancelled = await bodyOf(
      await learner.post(`/api/sponsorships/${(await theRequest()).id}/cancel`),
      200,
      sponsorshipSchema,
    );
    expect(cancelled.status).toBe('cancelled');
    expect(invoicing.sent).toHaveLength(0);
    expect((await buyCourse(learner, COURSE_ID)).captured.status).toBe('completed');
  });
});

describe('an invoice sent without Rewire hearing so', () => {
  it('is tied to its order before it is sent, so its payment opens the course', async () => {
    invoicing.loseNextAnswer('sent');
    await expectProblem(await ask(), 502, 'payment_provider_error');
    expect(await stored()).toEqual([['unconfirmed', theInvoice()]]);
    expect(invoicing.sent).toHaveLength(1);

    invoicing.pay(theInvoice());
    await notify('PAID', { id: theInvoice() });
    expect(await stored()).toEqual([['paid', theInvoice()]]);
    expect(await courses()).toHaveLength(1);
  });

  it('when the server stopped before saving the answer, is found by a refresh', async () => {
    invoicing.stopAfterNext('sent');
    expect((await ask()).status).toBe(500);
    expect(await stored()).toEqual([['sending', theInvoice()]]);

    const request = await theRequest();
    expect(await refresh(request.id)).toMatchObject({ status: 'sent', payUrl: anyString });
    await expectProblem(
      await learner.post('/api/checkout/orders', { courseId: COURSE_ID, region: 'us' }),
      409,
      'invoice_pending',
    );
  });

  it('whose id was never learnt, is found by the reference of its webhook', async () => {
    invoicing.stopAfterNext('created');
    expect((await ask()).status).toBe(500);
    const [orderId] = (await api.database.execute('SELECT id FROM orders')).rows.map((row) =>
      z.string().parse(row['id']),
    );
    await notify('CREATED', { id: theInvoice(), detail: { reference: orderId ?? '' } });
    expect(await stored()).toEqual([['sent', theInvoice()]]);

    invoicing.pay(theInvoice());
    await notify('PAID', { id: theInvoice() });
    expect(await stored()).toEqual([['paid', theInvoice()]]);
    expect(await courses()).toHaveLength(1);
  });

  it('that cannot be read back is still recorded as sent, and a refresh finds its page', async () => {
    invoicing.failNext('UNREACHABLE', 'read');
    const sponsorship = await bodyOf(await ask(), 201, sponsorshipSchema);
    expect(sponsorship).toMatchObject({ status: 'sent', payUrl: null });
    expect((await refresh(sponsorship.id)).payUrl).toContain(theInvoice());
  });
});

describe('an invoice PayPal refuses to send', () => {
  it('fails its order and frees the course, and the draft is never sent', async () => {
    invoicing.failNext('INVALID_RECIPIENT', 'sent');
    await expectProblem(await ask(), 502, 'payment_provider_error');
    expect(await stored()).toEqual([['refused', theInvoice()]]);
    expect(invoicing.sent).toHaveLength(0);
    const list = await bodyOf(
      await dashboardGet(learner, '/api/sponsorships'),
      200,
      sponsorshipListSchema,
    );
    expect(list.sponsorships).toEqual([]);
    expect((await buyCourse(learner, COURSE_ID)).captured.status).toBe('completed');
  });
});
