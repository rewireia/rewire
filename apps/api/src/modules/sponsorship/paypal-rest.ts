import { z } from 'zod';

import type { MerchantCredentials } from '../../config.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Fetch } from '../../platform/fetch.ts';
import { PaymentGatewayError } from '../checkout/gateway.ts';
import { payPalErrorOf } from '../checkout/paypal-error.ts';

const HOSTS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;
const REQUEST_TIMEOUT_MS = 20_000;
/** A token is replaced this long before PayPal would expire it. */
const TOKEN_MARGIN_MS = 60_000;
/** PayPal's answer when the token of the call carries no permission for it. */
const NOT_AUTHORIZED = 'NOT_AUTHORIZED';

const tokenSchema = z.object({
  access_token: z.string().min(1),
  /** Seconds the token lives. */
  expires_in: z.number().positive(),
});

export interface RestRequest {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body?: unknown;
  /** Sent as `PayPal-Request-Id`, so that repeating the request has no second effect. */
  readonly idempotencyKey?: string;
}

/**
 * The parts of PayPal's REST API that its server SDK does not cover, such as invoicing.
 * It signs in with the merchant's credentials and keeps the access token until it nears
 * its expiry.
 *
 * PayPal keeps handing out the same token for hours, with the permissions the app had when
 * it was issued. An app that has just been given invoicing is therefore refused with a
 * token from before: on that refusal the client retires the token, signs in again and
 * tries once more.
 */
export interface PayPalRest {
  /** Sends a request and returns the JSON of the answer, or `undefined` when it has none. */
  send(request: RestRequest): Promise<unknown>;
}

export function createPayPalRest(
  merchant: MerchantCredentials,
  environment: 'sandbox' | 'live',
  clock: Clock,
  fetcher: Fetch = (url, init) => fetch(url, init),
): PayPalRest {
  const host = HOSTS[environment];
  const call: Call = (url, init) => callPayPal(fetcher, url, init);
  const signIn = createSignIn(merchant, host, clock, call);

  const sendOnce = async ({ method, path, body, idempotencyKey }: RestRequest) => {
    const headers = new Headers({
      Authorization: `Bearer ${await signIn.accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    });
    if (idempotencyKey !== undefined) {
      headers.set('PayPal-Request-Id', idempotencyKey);
    }
    return call(`${host}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  return {
    async send(request) {
      try {
        return await sendOnce(request);
      } catch (error) {
        if (error instanceof PaymentGatewayError && error.issue === NOT_AUTHORIZED) {
          await signIn.retireToken();
          return sendOnce(request);
        }
        throw error;
      }
    },
  };
}

type Call = (url: string, init: RequestInit) => Promise<unknown>;

/** The merchant's access token: asked for once, kept until it nears its expiry. */
interface SignIn {
  accessToken(): Promise<string>;
  /** Tells PayPal to stop honouring the token, so the next sign-in gets a new one. */
  retireToken(): Promise<void>;
}

function createSignIn(
  merchant: MerchantCredentials,
  host: string,
  clock: Clock,
  call: Call,
): SignIn {
  const basic = Buffer.from(`${merchant.clientId}:${merchant.clientSecret}`).toString('base64');
  const headers = {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  let token: { value: string; expiresAt: number } | undefined;

  return {
    async accessToken() {
      if (token !== undefined && token.expiresAt - TOKEN_MARGIN_MS > clock().getTime()) {
        return token.value;
      }
      const answer = tokenSchema.safeParse(
        await call(`${host}/v1/oauth2/token`, {
          method: 'POST',
          headers,
          body: 'grant_type=client_credentials',
        }),
      );
      if (!answer.success) {
        throw new PaymentGatewayError('TOKEN_UNREADABLE');
      }
      const { access_token: value, expires_in: lifetime } = answer.data;
      token = { value, expiresAt: clock().getTime() + lifetime * 1000 };
      return value;
    },

    async retireToken() {
      const retired = token?.value;
      token = undefined;
      if (retired !== undefined) {
        const body = new URLSearchParams({ token: retired, token_type_hint: 'ACCESS_TOKEN' });
        await call(`${host}/v1/oauth2/token/terminate`, {
          method: 'POST',
          headers,
          body: body.toString(),
        });
      }
    },
  };
}

/**
 * Calls PayPal and returns the JSON of its answer. A refusal becomes a gateway error, and so does
 * a call whose effect is unknown, marked as such.
 */
async function callPayPal(fetcher: Fetch, url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  let text: string;
  try {
    response = await fetcher(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await response.text();
  } catch {
    throw new PaymentGatewayError('UNREACHABLE', undefined, 'unknown');
  }
  const json = parseJson(text);
  if (!response.ok) {
    const { issue, debugId } = payPalErrorOf(json);
    // A server error says nothing of whether the request took effect; a 4xx is a refusal.
    const outcome = response.status >= 500 ? 'unknown' : 'refused';
    throw new PaymentGatewayError(issue ?? `HTTP_${response.status}`, debugId, outcome);
  }
  if (json === UNREADABLE) {
    throw new PaymentGatewayError('UNREADABLE_ANSWER', undefined, 'unknown');
  }
  return json;
}

/** Marks an answer whose body is not JSON, which an empty body is not. */
const UNREADABLE = Symbol('unreadable');

function parseJson(text: string): unknown {
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return UNREADABLE;
  }
}
