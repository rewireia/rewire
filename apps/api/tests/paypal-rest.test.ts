import { describe, expect, it } from 'vitest';

import { PaymentGatewayError } from '../src/modules/checkout/gateway.ts';
import { createPayPalRest } from '../src/modules/sponsorship/paypal-rest.ts';
import type { Fetch } from '../src/platform/fetch.ts';

const MERCHANT = { clientId: 'client', clientSecret: 'secret', webhookId: undefined };
const HOUR_IN_SECONDS = 3600;

interface Sent {
  readonly url: string;
  readonly init: RequestInit;
}

/** PayPal's REST API in memory: a token for every sign-in, and a scripted answer for the rest. */
function fakePayPal(answer: (url: string) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  let tokens = 0;
  const fetcher: Fetch = (url, init) => {
    sent.push({ url, init });
    if (url.endsWith('/v1/oauth2/token')) {
      tokens += 1;
      return Promise.resolve(
        Response.json({ access_token: `TOKEN-${tokens}`, expires_in: HOUR_IN_SECONDS }),
      );
    }
    return Promise.resolve(answer(url));
  };
  return { fetcher, sent, tokenCount: () => tokens };
}

function movableClock() {
  let now = Date.parse('2026-11-11T09:00:00Z');
  return Object.assign(() => new Date(now), {
    advanceSeconds(seconds: number) {
      now += seconds * 1000;
    },
  });
}

const headerOf = (sent: Sent | undefined, name: string) =>
  new Headers(sent?.init.headers).get(name);

describe('the PayPal REST client', () => {
  it('retires a token from before the app was given a permission, and tries once more', async () => {
    const refusal = () =>
      Response.json({ name: 'NOT_AUTHORIZED', debug_id: 'debug-1' }, { status: 403 });
    let invoicingCalls = 0;
    const paypal = fakePayPal((url) => {
      if (url.endsWith('/v1/oauth2/token/terminate')) {
        return new Response(null, { status: 200 });
      }
      invoicingCalls += 1;
      return invoicingCalls === 1 ? refusal() : Response.json({ invoice_number: '0001' });
    });
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);

    expect(await rest.send({ method: 'POST', path: '/v2/invoicing/next' })).toEqual({
      invoice_number: '0001',
    });
    const retired = paypal.sent.find(({ url }) => url.endsWith('/v1/oauth2/token/terminate'));
    expect(retired?.init.body).toBe('token=TOKEN-1&token_type_hint=ACCESS_TOKEN');
    expect(paypal.tokenCount()).toBe(2);
    expect(headerOf(paypal.sent.at(-1), 'Authorization')).toBe('Bearer TOKEN-2');
  });

  it('tries no third time when the app has no such permission', async () => {
    let calls = 0;
    const paypal = fakePayPal((url) => {
      if (url.endsWith('/v1/oauth2/token/terminate')) {
        return new Response(null, { status: 200 });
      }
      calls += 1;
      return Response.json({ name: 'NOT_AUTHORIZED' }, { status: 403 });
    });
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    await expect(rest.send({ method: 'POST', path: '/v2/invoicing/next' })).rejects.toMatchObject({
      issue: 'NOT_AUTHORIZED',
    });
    expect(calls).toBe(2);
  });

  it('signs in once and reuses the token until it nears its expiry', async () => {
    const paypal = fakePayPal(() => Response.json({ ok: true }));
    const clock = movableClock();
    const rest = createPayPalRest(MERCHANT, 'sandbox', clock, paypal.fetcher);
    await rest.send({ method: 'GET', path: '/v2/one' });
    clock.advanceSeconds(HOUR_IN_SECONDS - 120);
    await rest.send({ method: 'GET', path: '/v2/two' });
    expect(paypal.tokenCount()).toBe(1);
    expect(headerOf(paypal.sent[2], 'Authorization')).toBe('Bearer TOKEN-1');

    clock.advanceSeconds(90);
    await rest.send({ method: 'GET', path: '/v2/three' });
    expect(paypal.tokenCount()).toBe(2);
    expect(headerOf(paypal.sent.at(-1), 'Authorization')).toBe('Bearer TOKEN-2');
  });

  it('signs in with the merchant credentials, at the host of its environment', async () => {
    const paypal = fakePayPal(() => Response.json({}));
    await createPayPalRest(MERCHANT, 'live', movableClock(), paypal.fetcher).send({
      method: 'GET',
      path: '/v2/x',
    });
    const [signIn, call] = paypal.sent;
    expect(signIn?.url).toBe('https://api-m.paypal.com/v1/oauth2/token');
    expect(headerOf(signIn, 'Authorization')).toBe(
      `Basic ${Buffer.from('client:secret').toString('base64')}`,
    );
    expect(call?.url).toBe('https://api-m.paypal.com/v2/x');
  });

  it('sends the idempotency key as PayPal-Request-Id, and the body as JSON', async () => {
    const paypal = fakePayPal(() => Response.json({ id: 'X' }));
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    expect(
      await rest.send({ method: 'POST', path: '/v2/x', body: { a: 1 }, idempotencyKey: 'key-1' }),
    ).toEqual({ id: 'X' });
    const call = paypal.sent.at(-1);
    expect(headerOf(call, 'PayPal-Request-Id')).toBe('key-1');
    expect(call?.init.body).toBe('{"a":1}');
  });

  it('answers undefined for an empty body', async () => {
    const paypal = fakePayPal(() => new Response(null, { status: 204 }));
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    expect(await rest.send({ method: 'POST', path: '/v2/send' })).toBeUndefined();
  });

  it("turns PayPal's error into a gateway error with its issue and debug id", async () => {
    const paypal = fakePayPal(() =>
      Response.json(
        {
          name: 'UNPROCESSABLE_ENTITY',
          debug_id: 'abc123',
          details: [{ issue: 'INVOICE_ALREADY_SENT', description: 'Already sent.' }],
        },
        { status: 422 },
      ),
    );
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    await expect(rest.send({ method: 'POST', path: '/v2/x' })).rejects.toMatchObject({
      issue: 'INVOICE_ALREADY_SENT',
      debugId: 'abc123',
    });
  });

  it('names the HTTP status when the error body says nothing usable', async () => {
    const paypal = fakePayPal(() => new Response('<html>busy</html>', { status: 503 }));
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    await expect(rest.send({ method: 'GET', path: '/v2/x' })).rejects.toMatchObject({
      issue: 'HTTP_503',
      debugId: undefined,
    });
  });

  it('refuses an answer that is not JSON', async () => {
    const paypal = fakePayPal(() => new Response('not json', { status: 200 }));
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), paypal.fetcher);
    await expect(rest.send({ method: 'GET', path: '/v2/x' })).rejects.toMatchObject({
      issue: 'UNREADABLE_ANSWER',
    });
  });

  it('reports a network failure as UNREACHABLE', async () => {
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), () =>
      Promise.reject(new TypeError('fetch failed')),
    );
    const failure = rest.send({ method: 'GET', path: '/v2/x' });
    await expect(failure).rejects.toBeInstanceOf(PaymentGatewayError);
    await expect(failure).rejects.toMatchObject({ issue: 'UNREACHABLE' });
  });

  it('refuses a token answer it cannot read', async () => {
    const rest = createPayPalRest(MERCHANT, 'sandbox', movableClock(), () =>
      Promise.resolve(Response.json({ token: 'wrong shape' })),
    );
    await expect(rest.send({ method: 'GET', path: '/v2/x' })).rejects.toMatchObject({
      issue: 'TOKEN_UNREADABLE',
    });
  });
});
