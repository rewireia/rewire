import {
  marketCatalogueSchema,
  marketSalesSchema,
  paymentListSchema,
  sponsorshipSchema,
  walletSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { bodyOf } from './support/client.ts';
import { createFakeInvoicing, type FakeInvoicing } from './support/fake-invoicing.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';
import { fundWallet } from './support/wallet.ts';

let api: TestApi;
let invoicing: FakeInvoicing;
beforeEach(async () => {
  invoicing = createFakeInvoicing();
  api = await createTestApi({ overrides: { invoicing: { us: invoicing } } });
});
afterEach(async () => {
  await api.close();
});

it('uses business published terms when creating an employer invoice', async () => {
  const business = api.client();
  const learner = api.client();
  await business.post('/api/session/sign-in', {
    username: 'Rewire',
    password: 'DemoDemoDemo',
    role: 'business',
  });
  const courseId = 'ai-for-office-work';
  const terms = { courseId, region: 'us', priceMinor: 5200, published: false };
  expect((await business.put(`/api/business/catalogue/${courseId}`, terms)).status).toBe(200);
  const request = {
    courseId,
    region: 'us',
    employerEmail: 'test@example.com',
    employerName: 'Example',
  };
  await expectProblem(await learner.post('/api/sponsorships', request), 404, 'not_found');
  expect(invoicing.calls.sent).toBe(0);
  expect(
    (await business.put(`/api/business/catalogue/${courseId}`, { ...terms, published: true }))
      .status,
  ).toBe(200);
  const invoice = await bodyOf(
    await learner.post('/api/sponsorships', request),
    201,
    sponsorshipSchema,
  );
  expect(invoice.amount).toEqual({ currency: 'USD', minorUnits: 5200 });
  expect(invoicing.sent[0]?.amount).toEqual(invoice.amount);
});

it('prices a separate invoice at published terms and reports the same paid order to both roles', async () => {
  const business = api.client();
  const learner = api.client();
  await business.post('/api/session/sign-in', {
    username: 'Rewire',
    password: 'DemoDemoDemo',
    role: 'business',
  });
  await learner.post('/api/session/sign-in', {
    username: 'Rewire',
    password: 'DemoDemoDemo',
    role: 'learner',
  });
  const courses = (
    await bodyOf(
      await business.get('/api/business/catalogue?region=us'),
      200,
      marketCatalogueSchema,
    )
  ).courses;
  for (const course of courses) {
    const input = {
      ...course,
      published: course.courseId === 'ai-for-office-work',
      priceMinor: 5200,
    };
    expect((await business.put(`/api/business/catalogue/${course.courseId}`, input)).status).toBe(
      200,
    );
  }
  await fundWallet(learner, 10000);
  const courseId = 'ai-for-office-work';
  const invoice = await bodyOf(
    await learner.post('/api/sponsorships', {
      courseId,
      region: 'us',
      employerEmail: 'test@example.com',
    }),
    201,
    sponsorshipSchema,
  );
  expect(invoice.amount.minorUnits).toBe(5200);
  await expectProblem(
    await learner.post('/api/wallet/payments', { courseIds: [courseId], region: 'us' }),
    409,
    'invoice_pending',
  );
  const invoiceId = invoicing.ids[0];
  if (!invoiceId) throw new Error('The fake invoice was not created');
  invoicing.pay(invoiceId);
  const settled = await bodyOf(
    await learner.post(`/api/sponsorships/${invoice.id}/refresh`),
    200,
    sponsorshipSchema,
  );
  expect(settled.status).toBe('paid');
  const payments = (await bodyOf(await learner.get('/api/payments'), 200, paymentListSchema))
    .payments;
  const payment = payments.find((entry) => entry.courseId === courseId);
  expect(payment?.status).toBe('completed');
  expect(payment?.amount).toEqual(invoice.amount);
  const sales = (await bodyOf(await business.get('/api/business/sales'), 200, marketSalesSchema))
    .sales;
  const sale = sales.find((entry) => entry.orderId === payment?.orderId);
  expect(sale?.status).toBe('completed');
  expect(sale?.amount).toEqual(invoice.amount);
  expect(sale?.method).toBe('employer-invoice');
  const wallet = await bodyOf(
    await learner.get('/api/marketplace/wallet?region=us'),
    200,
    walletSchema,
  );
  expect(wallet.spentMinor).toBe(0);
});
