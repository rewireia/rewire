import { sandboxBuyerSchema } from '@rewire/contracts';
import { z } from 'zod';

const optionalText = z.string().min(1).optional();

const configSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8200),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1).default('file:var/rewire.db'),
  PUBLIC_ORIGIN: z.url().optional(),
  WEB_ROOT: optionalText,
  SESSION_SECRET: z.string().min(32).optional(),
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_SANDBOX_DEMO_BUYER_EMAIL: optionalText,
  PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD: optionalText,
  PAYPAL_CLIENT_ID: optionalText,
  PAYPAL_CLIENT_SECRET: optionalText,
  PAYPAL_WEBHOOK_ID: optionalText,
  PAYPAL_UK_CLIENT_ID: optionalText,
  PAYPAL_UK_CLIENT_SECRET: optionalText,
  PAYPAL_UK_WEBHOOK_ID: optionalText,
  PAYPAL_EU_CLIENT_ID: optionalText,
  PAYPAL_EU_CLIENT_SECRET: optionalText,
  PAYPAL_EU_WEBHOOK_ID: optionalText,
  GUIDE_PROVIDER_TRAINS_ON_DATA: z.enum(['true', 'false']).default('false'),
  OPENAI_API_KEY: optionalText,
  OPENAI_MODEL: z.string().min(1).default('gpt-6.1-terra'),
  OPENAI_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('high'),
  GUIDE_DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().default(2_000_000),
  ANALYST_DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().default(600_000),
});

type Environment = z.infer<typeof configSchema>;

/** Where Vite serves the web in development. */
const DEVELOPMENT_ORIGIN = 'http://127.0.0.1:5200';

/** The PayPal REST application of the merchant that sells in a region. */
export interface MerchantCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  /** Id of the webhook subscription of the application; without it, webhooks are refused. */
  readonly webhookId: string | undefined;
}

export interface PaymentsConfig {
  readonly environment: 'sandbox' | 'live';
  /** Deliberately public fictional buyer for the sandbox demo, never real account credentials. */
  readonly sandboxBuyer?: { readonly email: string; readonly password: string };
  /**
   * The merchant of each region. PayPal offers pay-later and settles without conversion
   * only when the merchant is based in the buyer's country, so a region may have its own;
   * otherwise it sells through the default merchant. Empty when PayPal is not configured.
   */
  readonly merchants: Readonly<Partial<Record<'eu' | 'us' | 'uk', MerchantCredentials>>>;
}

/** The language model of the guide, at OpenAI. */
interface GuideModelConfig {
  readonly apiKey: string;
  readonly model: string;
  /** How hard the model reasons before it answers. */
  readonly effort: 'low' | 'medium' | 'high';
}

interface GuideConfig {
  /** Without a key the guide is off and the rest of the product works as usual. */
  readonly model: GuideModelConfig | undefined;
  /**
   * Whether the account at the provider lets it use what it receives to improve its
   * models. The server cannot find this out: whoever sets up the account says it here, and
   * the guide tells the person.
   */
  readonly providerTrainsOnData: boolean;
  /** Tokens the guide may spend per day, in and out. */
  readonly dailyTokenBudget: number;
  /**
   * Tokens the analyst of "Analyse" may spend per day. It has a budget of its own because
   * one question that rebuilds a dashboard takes it dozens of turns: it must not be able
   * to leave the guide without any.
   */
  readonly analystDailyTokenBudget: number;
}

/** The settings of a running server, read once from the environment. */
export interface Config {
  readonly environment: 'development' | 'test' | 'production';
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly databaseUrl: string;
  /** Where the web is served from: the only origin allowed to change state. */
  readonly publicOrigin: string;
  /**
   * The folder of the built web, for this server to serve it next to the API. Without it
   * the server answers the API only, as in development, where Vite serves the web.
   */
  readonly webRoot: string | undefined;
  /** Signs the session cookie. Outside production, one is created and kept locally. */
  readonly sessionSecret: string | undefined;
  readonly payments: PaymentsConfig;
  readonly guide: GuideConfig;
}

/** The environment holds a value the server cannot start with. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Reads and validates the configuration. Empty variables count as not set. */
export function loadConfig(environment: NodeJS.ProcessEnv): Config {
  const set = Object.fromEntries(Object.entries(environment).filter(([, value]) => value !== ''));
  const parsed = configSchema.safeParse(set);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new ConfigError(`invalid configuration: ${problems.join('; ')}`);
  }
  const values = parsed.data;
  if (values.APP_ENV === 'production' && values.SESSION_SECRET === undefined) {
    throw new ConfigError('SESSION_SECRET is required in production');
  }
  if (values.APP_ENV === 'production' && values.PUBLIC_ORIGIN === undefined) {
    // Without it every write from the real site would be refused as coming from elsewhere.
    throw new ConfigError('PUBLIC_ORIGIN is required in production');
  }
  if (values.PAYPAL_ENV === 'live' && values.APP_ENV !== 'production') {
    throw new ConfigError('PAYPAL_ENV=live is allowed only with APP_ENV=production');
  }
  return {
    environment: values.APP_ENV,
    host: values.HOST,
    port: values.PORT,
    logLevel: values.LOG_LEVEL,
    databaseUrl: values.DATABASE_URL,
    publicOrigin: new URL(values.PUBLIC_ORIGIN ?? DEVELOPMENT_ORIGIN).origin,
    webRoot: values.WEB_ROOT,
    sessionSecret: values.SESSION_SECRET,
    payments: {
      environment: values.PAYPAL_ENV,
      merchants: merchantsOf(values),
      ...sandboxBuyerOf(values),
    },
    guide: {
      model: guideModelOf(values),
      providerTrainsOnData: values.GUIDE_PROVIDER_TRAINS_ON_DATA === 'true',
      dailyTokenBudget: values.GUIDE_DAILY_TOKEN_BUDGET,
      analystDailyTokenBudget: values.ANALYST_DAILY_TOKEN_BUDGET,
    },
  };
}

/** The model the guide talks to, when the server has a key for it. */
function guideModelOf(values: Environment): GuideModelConfig | undefined {
  return values.OPENAI_API_KEY === undefined
    ? undefined
    : {
        apiKey: values.OPENAI_API_KEY,
        model: values.OPENAI_MODEL,
        effort: values.OPENAI_REASONING_EFFORT,
      };
}

function sandboxBuyerOf(values: Environment): Pick<PaymentsConfig, 'sandboxBuyer'> {
  const email = values.PAYPAL_SANDBOX_DEMO_BUYER_EMAIL;
  const password = values.PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD;
  if (email === undefined && password === undefined) return {};
  if (email === undefined || password === undefined) {
    throw new ConfigError('PAYPAL_SANDBOX_DEMO_BUYER_EMAIL and PASSWORD must be set together');
  }
  if (values.PAYPAL_ENV !== 'sandbox') {
    throw new ConfigError(
      'Public sandbox demo buyer credentials cannot be used with live payments',
    );
  }
  const buyer = sandboxBuyerSchema.safeParse({ email, password });
  if (!buyer.success)
    throw new ConfigError('The sandbox demo buyer must use a personal.example.com email');
  return { sandboxBuyer: buyer.data };
}

function merchantsOf(values: Environment): PaymentsConfig['merchants'] {
  const fallback = merchantOf(
    'PAYPAL',
    values.PAYPAL_CLIENT_ID,
    values.PAYPAL_CLIENT_SECRET,
    values.PAYPAL_WEBHOOK_ID,
  );
  const uk =
    merchantOf(
      'PAYPAL_UK',
      values.PAYPAL_UK_CLIENT_ID,
      values.PAYPAL_UK_CLIENT_SECRET,
      values.PAYPAL_UK_WEBHOOK_ID,
    ) ?? fallback;
  const eu =
    merchantOf(
      'PAYPAL_EU',
      values.PAYPAL_EU_CLIENT_ID,
      values.PAYPAL_EU_CLIENT_SECRET,
      values.PAYPAL_EU_WEBHOOK_ID,
    ) ?? fallback;
  return {
    ...(fallback === undefined ? {} : { us: fallback }),
    ...(uk === undefined ? {} : { uk }),
    ...(eu === undefined ? {} : { eu }),
  };
}

function merchantOf(
  prefix: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
  webhookId: string | undefined,
): MerchantCredentials | undefined {
  if (clientId === undefined && clientSecret === undefined) {
    return undefined;
  }
  if (clientId === undefined || clientSecret === undefined) {
    throw new ConfigError(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set together`);
  }
  return { clientId, clientSecret, webhookId };
}
