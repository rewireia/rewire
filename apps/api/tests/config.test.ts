import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.ts';

const SECRET = 'x'.repeat(32);

describe('configuration', () => {
  it('runs locally with no variables at all', () => {
    expect(loadConfig({})).toEqual({
      environment: 'development',
      host: '127.0.0.1',
      port: 8200,
      logLevel: 'info',
      databaseUrl: 'file:var/rewire.db',
      publicOrigin: 'http://127.0.0.1:5200',
      webRoot: undefined,
      sessionSecret: undefined,
      payments: { environment: 'sandbox', merchants: {} },
      guide: {
        model: undefined,
        providerTrainsOnData: false,
        dailyTokenBudget: 2_000_000,
        analystDailyTokenBudget: 600_000,
      },
    });
  });

  it('turns the guide on with a key, and reads its model, effort and daily budget', () => {
    expect(loadConfig({ OPENAI_API_KEY: 'test-key' }).guide.model).toEqual({
      apiKey: 'test-key',
      model: 'gpt-6.1-terra',
      effort: 'high',
    });
    expect(
      loadConfig({
        OPENAI_API_KEY: 'test-key',
        OPENAI_MODEL: 'another-model',
        OPENAI_REASONING_EFFORT: 'low',
        GUIDE_DAILY_TOKEN_BUDGET: '5000',
      }).guide,
    ).toEqual({
      model: { apiKey: 'test-key', model: 'another-model', effort: 'low' },
      providerTrainsOnData: false,
      dailyTokenBudget: 5000,
      analystDailyTokenBudget: 600_000,
    });
    expect(loadConfig({ ANALYST_DAILY_TOKEN_BUDGET: '9000' }).guide.analystDailyTokenBudget).toBe(
      9000,
    );
    expect(() => loadConfig({ OPENAI_REASONING_EFFORT: 'maximum' })).toThrow(ConfigError);
  });

  it('is told whether the provider may learn from what people write', () => {
    expect(loadConfig({ GUIDE_PROVIDER_TRAINS_ON_DATA: 'true' }).guide.providerTrainsOnData).toBe(
      true,
    );
    expect(() => loadConfig({ GUIDE_PROVIDER_TRAINS_ON_DATA: 'yes' })).toThrow(ConfigError);
  });

  it('refuses a daily budget that is not a positive whole number', () => {
    expect(() => loadConfig({ GUIDE_DAILY_TOKEN_BUDGET: '0' })).toThrow(/GUIDE_DAILY_TOKEN_BUDGET/);
    expect(() => loadConfig({ GUIDE_DAILY_TOKEN_BUDGET: '1.5' })).toThrow(ConfigError);
  });

  it('counts an empty variable as not set', () => {
    expect(loadConfig({ PORT: '', LOG_LEVEL: '', PAYPAL_CLIENT_ID: '' }).port).toBe(8200);
  });

  it('keeps only the origin of the public address', () => {
    expect(loadConfig({ PUBLIC_ORIGIN: 'https://rewire.example/app/' }).publicOrigin).toBe(
      'https://rewire.example',
    );
  });

  it('serves the web too when it is told where its build is', () => {
    expect(loadConfig({ WEB_ROOT: '../web/dist' }).webRoot).toBe('../web/dist');
  });

  it('refuses a value it cannot use', () => {
    expect(() => loadConfig({ PORT: '99999' })).toThrow(ConfigError);
  });

  it('requires a session secret and the public address in production', () => {
    const production = { APP_ENV: 'production', PUBLIC_ORIGIN: 'https://rewire.example' };
    expect(() => loadConfig(production)).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ APP_ENV: 'production', SESSION_SECRET: SECRET })).toThrow(
      /PUBLIC_ORIGIN/,
    );
    expect(loadConfig({ ...production, SESSION_SECRET: SECRET })).toMatchObject({
      sessionSecret: SECRET,
      publicOrigin: 'https://rewire.example',
    });
  });

  it('counts an empty public address as not set', () => {
    // A deployment that fills it from a variable of the platform must not start with none.
    expect(() =>
      loadConfig({ APP_ENV: 'production', SESSION_SECRET: SECRET, PUBLIC_ORIGIN: '' }),
    ).toThrow(/PUBLIC_ORIGIN/);
  });

  it('allows live payments in production only', () => {
    expect(() => loadConfig({ PAYPAL_ENV: 'live' })).toThrow(/APP_ENV=production/);
  });

  it('needs the PayPal client id and secret together', () => {
    expect(() => loadConfig({ PAYPAL_CLIENT_ID: 'id' })).toThrow(/must be set together/);
    expect(() => loadConfig({ PAYPAL_UK_CLIENT_SECRET: 'secret' })).toThrow(/PAYPAL_UK_/);
  });

  it('sells every region through the default merchant unless a region has its own', () => {
    const merchants = loadConfig({
      PAYPAL_CLIENT_ID: 'default-id',
      PAYPAL_CLIENT_SECRET: 'default-secret',
      PAYPAL_WEBHOOK_ID: 'WH-DEFAULT',
      PAYPAL_UK_CLIENT_ID: 'uk-id',
      PAYPAL_UK_CLIENT_SECRET: 'uk-secret',
    }).payments.merchants;
    expect(merchants.us).toEqual({
      clientId: 'default-id',
      clientSecret: 'default-secret',
      webhookId: 'WH-DEFAULT',
    });
    expect(merchants.eu).toEqual(merchants.us);
    expect(merchants.uk).toEqual({
      clientId: 'uk-id',
      clientSecret: 'uk-secret',
      webhookId: undefined,
    });
  });

  it('sells only where a merchant is set up', () => {
    const merchants = loadConfig({ PAYPAL_EU_CLIENT_ID: 'eu-id', PAYPAL_EU_CLIENT_SECRET: 's' })
      .payments.merchants;
    expect(Object.keys(merchants)).toEqual(['eu']);
  });
});
