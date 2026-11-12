import { paymentConfigSchema } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.ts';
import { paymentConfigOf } from '../src/modules/checkout/checkout-service.ts';
import { bodyOf } from './support/client.ts';
import { createTestApi } from './support/test-api.ts';

const BUYER = { email: 'sb-test@personal.example.com', password: 'fictional-password' };
const DEMO = {
  PAYPAL_SANDBOX_DEMO_BUYER_EMAIL: BUYER.email,
  PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD: BUYER.password,
};
const LIVE = {
  APP_ENV: 'production',
  PUBLIC_ORIGIN: 'https://example.com',
  SESSION_SECRET: 's'.repeat(32),
  PAYPAL_ENV: 'live',
};

describe('public sandbox demo buyer', () => {
  it('requires an explicit pair and a fictional personal sandbox email', () => {
    expect(loadConfig({}).payments.sandboxBuyer).toBeUndefined();
    expect(loadConfig(DEMO).payments.sandboxBuyer).toEqual(BUYER);
    expect(() => loadConfig({ PAYPAL_SANDBOX_DEMO_BUYER_EMAIL: BUYER.email })).toThrow(ConfigError);
    expect(() => loadConfig({ PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD: BUYER.password })).toThrow(
      ConfigError,
    );
    expect(() =>
      loadConfig({ ...DEMO, PAYPAL_SANDBOX_DEMO_BUYER_EMAIL: 'buyer@example.com' }),
    ).toThrow(ConfigError);
    expect(() =>
      loadConfig({
        ...DEMO,
        PAYPAL_SANDBOX_DEMO_BUYER_EMAIL: 'buyer@personal.example.com.evil.test',
      }),
    ).toThrow(ConfigError);
    expect(() => loadConfig({ ...LIVE, ...DEMO })).toThrow(ConfigError);
  });
  it('does not infer publicly displayed credentials from test-only variables', () => {
    const payments = loadConfig({
      PAYPAL_SANDBOX_BUYER_EMAIL: BUYER.email,
      PAYPAL_SANDBOX_BUYER_PASSWORD: BUYER.password,
    }).payments;
    expect(payments.sandboxBuyer).toBeUndefined();
  });
  it('omits even accidentally supplied demo credentials from live payment configuration', () => {
    const merchant = {
      clientId: 'public-client',
      clientSecret: 'private-secret',
      webhookId: undefined,
    };
    const result = paymentConfigOf(
      { environment: 'live', merchants: { us: merchant }, sandboxBuyer: BUYER },
      'us',
    );
    expect(result).toEqual({
      available: true,
      environment: 'live',
      clientId: 'public-client',
      currency: 'USD',
    });
  });
  it('returns only the explicit demo buyer with the public client ID in sandbox', async () => {
    const api = await createTestApi({ environment: DEMO });
    try {
      const response = await api.client().get('/api/regions/us/payment-config');
      const result = await bodyOf(response, 200, paymentConfigSchema);
      expect(result).toEqual({
        available: true,
        environment: 'sandbox',
        clientId: 'test-client',
        currency: 'USD',
        sandboxBuyer: BUYER,
      });
      expect(JSON.stringify(result)).not.toContain('test-secret');
      expect(JSON.stringify(result)).not.toContain('session-secret');
    } finally {
      await api.close();
    }
  });
  it('does not expose a demo buyer when the merchant is unavailable', async () => {
    const api = await createTestApi({ payments: false, environment: DEMO });
    try {
      const result = await bodyOf(
        await api.client().get('/api/regions/us/payment-config'),
        200,
        paymentConfigSchema,
      );
      expect(result).toEqual({
        available: false,
        reason: 'This server has no PayPal credentials.',
      });
    } finally {
      await api.close();
    }
  });
});
