import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  captureResultSchema,
  problemSchema,
  startedOrderSchema,
  type Region,
} from '@rewire/contracts';
import { loadDataBundle, type DataBundle } from '@rewire/data';
import type { Hono } from 'hono';
import { expect } from 'vitest';

import { loadConfig } from '../../src/config.ts';
import { createContainer, type Overrides } from '../../src/container.ts';
import type { HttpEnvironment } from '../../src/http/environment.ts';
import { createLogger } from '../../src/logger.ts';
import { openDatabase, type Database } from '../../src/platform/database.ts';

import { bodyOf, createTestClient, type TestClient } from './client.ts';
import { createFakeGateway, type FakeGateway } from './fake-gateway.ts';

/** The day every test starts on. */
export const START = new Date('2026-11-11T09:00:00.000Z');
export const WEBHOOK_ID = 'WH-TEST-SUBSCRIPTION';
const SESSION_SECRET = 'a-session-secret-for-tests-only-0123456789';

/** A clock the test moves by hand. */
export interface TestClock {
  (): Date;
  advanceDays(days: number): void;
}

export interface TestApiOptions {
  /** Whether PayPal is configured. On by default. */
  readonly payments?: boolean;
  readonly gateway?: FakeGateway;
  readonly overrides?: Omit<Overrides, 'bundle' | 'clock' | 'gateways'>;
  /** More variables of the environment, such as `GUIDE_DAILY_TOKEN_BUDGET`. */
  readonly environment?: Readonly<Record<string, string>>;
}

/** The whole API over a fresh database file, with fake PayPal and a fixed clock. */
export interface TestApi {
  readonly app: Hono<HttpEnvironment>;
  readonly gateway: FakeGateway;
  readonly clock: TestClock;
  /** A second connection to the database, to look at what the API wrote. */
  readonly database: Database;
  readonly bundle: DataBundle;
  client(): TestClient;
  close(): Promise<void>;
}

let sharedBundle: Promise<DataBundle> | undefined;

/** The real data bundle, read once per test file. */
function realBundle(): Promise<DataBundle> {
  sharedBundle ??= loadDataBundle();
  return sharedBundle;
}

export function createTestClock(start = START): TestClock {
  let now = start.getTime();
  return Object.assign(() => new Date(now), {
    advanceDays(days: number) {
      now += days * 24 * 60 * 60 * 1000;
    },
  });
}

export async function createTestApi(options: TestApiOptions = {}): Promise<TestApi> {
  const directory = await mkdtemp(path.join(tmpdir(), 'rewire-api-'));
  const databaseUrl = `file:${path.join(directory, 'rewire.db')}`;
  const payments = options.payments ?? true;
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_URL: databaseUrl,
    SESSION_SECRET,
    ...(payments
      ? {
          PAYPAL_CLIENT_ID: 'test-client',
          PAYPAL_CLIENT_SECRET: 'test-secret',
          PAYPAL_WEBHOOK_ID: WEBHOOK_ID,
        }
      : {}),
    ...options.environment,
  });
  const gateway = options.gateway ?? createFakeGateway();
  const clock = createTestClock();
  const bundle = await realBundle();
  const container = await createContainer(
    config,
    createLogger('error', () => undefined),
    {
      ...options.overrides,
      bundle,
      clock,
      gateways: payments ? { eu: gateway, us: gateway, uk: gateway } : {},
    },
  );
  const database = await openDatabase(databaseUrl);
  return {
    app: container.app,
    gateway,
    clock,
    database,
    bundle,
    client: () => createTestClient(container.app),
    async close() {
      database.close();
      container.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

/** Signs one browser into the shared demo with an explicit role. */
export async function signInDemo(client: TestClient, role: 'learner' | 'business' = 'learner') {
  const response = await client.post('/api/session/sign-in', {
    username: 'Rewire',
    password: 'DemoDemoDemo',
    role,
  });
  expect(response.status).toBe(200);
}

/** Opens an order for a course as the client, as the browser does before PayPal's buttons. */
export async function startOrder(client: TestClient, courseId: string, region: Region = 'us') {
  return bodyOf(
    await client.post('/api/checkout/orders', { courseId, region }),
    201,
    startedOrderSchema,
  );
}

/** Buys a course end to end: the order is opened, approved at PayPal and captured. */
export async function buyCourse(client: TestClient, courseId: string, region: Region = 'us') {
  const order = await startOrder(client, courseId, region);
  const captured = await bodyOf(
    await client.post(`/api/checkout/orders/${order.orderId}/capture`),
    200,
    captureResultSchema,
  );
  return { ...order, captured };
}

/** Checks that an answer is a problem with the given status and code. */
export async function expectProblem(response: Response, status: number, code: string) {
  const problem = await bodyOf(response, status, problemSchema);
  expect(problem.code).toBe(code);
  return problem;
}
