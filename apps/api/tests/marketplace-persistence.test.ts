import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  captureResultSchema,
  enrolmentListSchema,
  marketCatalogueSchema,
  marketSalesSchema,
  paymentListSchema,
  sessionSchema,
  walletSchema,
} from '@rewire/contracts';
import { loadDataBundle } from '@rewire/data';
import { expect, it } from 'vitest';

import { loadConfig } from '../src/config.ts';
import { createContainer } from '../src/container.ts';
import { createLogger } from '../src/logger.ts';
import { bodyOf, createTestClient } from './support/client.ts';
import { createFakeGateway } from './support/fake-gateway.ts';
import { fundWallet } from './support/wallet.ts';

it('retains the wallet, the marketplace and a refundable course across a server restart', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rewire-persistence-'));
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_URL: `file:${path.join(directory, 'rewire.db')}`,
    SESSION_SECRET: 'a-session-secret-for-tests-only-0123456789',
    PAYPAL_CLIENT_ID: 'test-client',
    PAYPAL_CLIENT_SECRET: 'test-secret',
  });
  const gateway = createFakeGateway();
  const bundle = await loadDataBundle();
  const logger = createLogger('error', () => undefined);
  const overrides = { bundle, gateways: { us: gateway }, model: null } as const;
  let container = await createContainer(config, logger, overrides);
  try {
    const learner = createTestClient(container.app);
    const business = createTestClient(container.app);
    const profile = {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
      timeByTask: {},
    };
    await learner.put('/api/session/profile', profile);
    await learner.post('/api/session/sign-in', {
      username: 'Rewire',
      password: 'DemoDemoDemo',
      role: 'learner',
    });
    await business.post('/api/session/sign-in', {
      username: 'Rewire',
      password: 'DemoDemoDemo',
      role: 'business',
    });
    const courseId = 'ai-foundations';
    const terms = { courseId, region: 'us', priceMinor: 2500, published: true };
    expect((await business.put(`/api/business/catalogue/${courseId}`, terms)).status).toBe(200);
    await fundWallet(learner, 10000);
    const order = await bodyOf(
      await learner.post('/api/wallet/payments', { courseIds: [courseId], region: 'us' }),
      201,
      captureResultSchema,
    );
    expect(order.status).toBe('completed');
    const learnerCookie = learner.cookie;
    const businessCookie = business.cookie;
    expect(learnerCookie).toBeDefined();
    expect(businessCookie).toBeDefined();
    container.close();
    container = await createContainer(config, logger, overrides);
    const restoredLearner = createTestClient(container.app);
    const restoredBusiness = createTestClient(container.app);
    const freshBrowser = createTestClient(container.app);
    restoredLearner.cookie = learnerCookie;
    restoredBusiness.cookie = businessCookie;
    expect(
      (await bodyOf(await restoredLearner.get('/api/session'), 200, sessionSchema)).accessRole,
    ).toBe('learner');
    expect(
      (await bodyOf(await restoredBusiness.get('/api/session'), 200, sessionSchema)).accessRole,
    ).toBe('business');
    await freshBrowser.post('/api/session/sign-in', {
      username: 'Rewire',
      password: 'DemoDemoDemo',
      role: 'learner',
    });
    expect(
      (await bodyOf(await freshBrowser.get('/api/session'), 200, sessionSchema)).profile,
    ).toEqual(profile);
    expect(
      (await bodyOf(await freshBrowser.get('/api/marketplace/wallet?region=us'), 200, walletSchema))
        .spentMinor,
    ).toBe(terms.priceMinor);
    expect(
      (await bodyOf(await freshBrowser.get('/api/payments'), 200, paymentListSchema)).payments.some(
        (item) => item.orderId === order.orderId,
      ),
    ).toBe(true);
    const catalogue = await bodyOf(
      await restoredBusiness.get('/api/business/catalogue?region=us'),
      200,
      marketCatalogueSchema,
    );
    expect(catalogue.courses.find((course) => course.courseId === courseId)).toMatchObject(terms);
    const wallet = await bodyOf(
      await restoredLearner.get('/api/marketplace/wallet?region=us'),
      200,
      walletSchema,
    );
    expect(wallet).toMatchObject({
      fundedMinor: 10000,
      spentMinor: terms.priceMinor,
    });
    const learning = await bodyOf(
      await restoredLearner.get('/api/learning'),
      200,
      enrolmentListSchema,
    );
    expect(
      learning.enrolments.some(
        (enrolment) => enrolment.courseId === courseId && enrolment.status === 'active',
      ),
    ).toBe(true);
    const payments = await bodyOf(
      await restoredLearner.get('/api/payments'),
      200,
      paymentListSchema,
    );
    expect(payments.payments.find((payment) => payment.orderId === order.orderId)?.status).toBe(
      'completed',
    );
    const before = await bodyOf(
      await restoredBusiness.get('/api/business/sales'),
      200,
      marketSalesSchema,
    );
    expect(before.sales.find((sale) => sale.id === order.orderId)?.status).toBe('completed');
    expect(
      (
        await bodyOf(
          await restoredLearner.post(`/api/payments/${order.orderId}/refund`),
          200,
          captureResultSchema,
        )
      ).status,
    ).toBe('refunded');
    const refundedPayments = await bodyOf(
      await restoredLearner.get('/api/payments'),
      200,
      paymentListSchema,
    );
    expect(
      refundedPayments.payments.find((payment) => payment.orderId === order.orderId)?.status,
    ).toBe('refunded');
    const after = await bodyOf(
      await restoredBusiness.get('/api/business/sales'),
      200,
      marketSalesSchema,
    );
    expect(after.sales.find((sale) => sale.id === order.orderId)?.status).toBe('refunded');
    const refundedWallet = await bodyOf(
      await restoredLearner.get('/api/marketplace/wallet?region=us'),
      200,
      walletSchema,
    );
    expect(refundedWallet).toMatchObject({ spentMinor: 0, availableMinor: 10000 });
    const revoked = await bodyOf(
      await restoredLearner.get('/api/learning'),
      200,
      enrolmentListSchema,
    );
    expect(revoked.enrolments.some((enrolment) => enrolment.courseId === courseId)).toBe(false);
  } finally {
    container.close();
    await rm(directory, { recursive: true, force: true });
  }
});
