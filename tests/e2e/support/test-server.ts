/**
 * The API for end-to-end tests: the real application over a throw-away database, with a
 * fake PayPal, a fake PayPal invoicing and a deterministic stand-in for the language model,
 * all in memory, so the browser can go through the whole product without keys or network.
 *
 * It exists for tests only. The product has no simulated payments and no simulated guide:
 * a server without PayPal credentials says so and sells nothing, and one without an AI key
 * turns the guide off.
 *
 *   PORT=8290 PUBLIC_ORIGIN=http://127.0.0.1:5290 tsx --conditions=rewire-source tests/e2e/support/test-server.ts
 *
 * Besides the API under `/api`, it answers one route a test needs and the product never has:
 * `POST /test/invoices/:invoiceId/pay` marks a fake invoice as paid, as the employer would.
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { loadDataBundle } from '@rewire/data';

import { loadConfig } from '../../../apps/api/src/config.ts';
import { createContainer } from '../../../apps/api/src/container.ts';
import { createLogger } from '../../../apps/api/src/logger.ts';
import { createFakeGateway } from '../../../apps/api/tests/support/fake-gateway.ts';
import { createFakeInvoicing } from '../../../apps/api/tests/support/fake-invoicing.ts';

import { createDemoModel } from './demo-model.ts';
import { createDemoStudioModel } from './demo-studio-model.ts';

const TEST_PREFIX = '/test/';

const directory = await mkdtemp(path.join(tmpdir(), 'rewire-e2e-'));
const config = loadConfig({
  APP_ENV: 'test',
  PORT: process.env['PORT'] ?? '8290',
  PUBLIC_ORIGIN: process.env['PUBLIC_ORIGIN'] ?? 'http://127.0.0.1:5290',
  DATABASE_URL: `file:${path.join(directory, 'e2e-0.db')}`,
  SESSION_SECRET: 'a-session-secret-for-end-to-end-tests-only',
  // Not real credentials: they make the regions report that payments are available.
  PAYPAL_CLIENT_ID: 'e2e-client-id',
  PAYPAL_CLIENT_SECRET: 'e2e-client-secret',
});

const bundle = await loadDataBundle();
let sequence = 0;

async function freshState() {
  const gateway = createFakeGateway();
  const invoicing = createFakeInvoicing();
  const databaseUrl = `file:${path.join(directory, `e2e-${sequence++}.db`)}`;
  const container = await createContainer({ ...config, databaseUrl }, createLogger('warn'), {
    bundle,
    gateways: { eu: gateway, us: gateway, uk: gateway },
    invoicing: { eu: invoicing, us: invoicing, uk: invoicing },
    model: createDemoModel(),
    studioModel: createDemoStudioModel(),
  });
  return { container, invoicing };
}

let state = await freshState();

/** What only a test can do: play the employer who pays an invoice. */
const testRoutes = new Hono()
  .post('/test/reset', async (context) => {
    const previous = state;
    state = await freshState();
    previous.container.close();
    return context.body(null, 204);
  })
  .post('/test/invoices/:invoiceId/pay', (context) => {
    try {
      state.invoicing.pay(context.req.param('invoiceId'));
    } catch {
      return context.json({ status: 404, code: 'not_found', title: 'No such invoice' }, 404);
    }
    return context.body(null, 204);
  });

const server = serve(
  {
    fetch: (request) =>
      new URL(request.url).pathname.startsWith(TEST_PREFIX)
        ? testRoutes.fetch(request)
        : state.container.app.fetch(request),
    hostname: config.host,
    port: config.port,
  },
  () => {
    process.stdout.write(`test server listening on ${config.host}:${config.port}\n`);
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      state.container.close();
      process.exit(0);
    });
  });
}
