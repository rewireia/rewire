import { copyFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { migrate, openDatabase, type Database } from '../src/platform/database.ts';

import { START } from './support/test-api.ts';

const clock = () => START;
const API_MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url));
const WALLET = '0010_wallet.sql';
const TABLES = [
  'learners',
  'orders',
  'order_items',
  'payment_events',
  'enrolments',
  'purchase_holds',
  'market_quotes',
  'sponsorships',
];

let directory: string;
let migrations: string;
let database: Database;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'rewire-wallet-migration-'));
  migrations = path.join(directory, 'migrations');
  await mkdir(migrations);
  for (const name of await readdir(API_MIGRATIONS)) {
    if (name.endsWith('.sql') && name < WALLET) {
      await copyFile(path.join(API_MIGRATIONS, name), path.join(migrations, name));
    }
  }
  database = await openDatabase(`file:${path.join(directory, 'test.db')}`);
  await migrate(database, { clock, directory: migrations });
});

afterEach(async () => {
  database.close();
  await rm(directory, { recursive: true, force: true });
});

/** A database as the previous release left it: paid, refunded and invoiced orders, and more. */
async function seed() {
  const at = START.toISOString();
  await database.batch(
    [
      `INSERT INTO learners (id, created_at) VALUES ('learner', '${at}')`,
      `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
         status, paypal_order_id, paypal_capture_id, created_at, paid_at)
       VALUES ('paid', 'learner', 'ai-foundations', 'us', 'paypal', 'USD', 4900, 'completed',
         'PAYPAL-1', 'CAPTURE-1', '${at}', '${at}')`,
      `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
         status, created_at, refund_attempts)
       VALUES ('invoiced', 'learner', 'ai-for-managers', 'us', 'employer-invoice', 'USD', 5200,
         'created', '${at}', 1)`,
      `INSERT INTO order_items (order_id, course_id, amount_minor)
       VALUES ('paid', 'ai-foundations', 4900)`,
      `INSERT INTO payment_events (order_id, kind, amount_minor, currency, paypal_reference,
         source, occurred_at)
       VALUES ('paid', 'capture-completed', 4900, 'USD', 'CAPTURE-1', 'checkout', '${at}')`,
      `INSERT INTO enrolments (id, learner_id, course_id, order_id, status, started_at)
       VALUES ('enrolment', 'learner', 'ai-foundations', 'paid', 'active', '${at}')`,
      `INSERT INTO purchase_holds (learner_id, course_id, order_id, token, taken_at)
       VALUES ('learner', 'ai-foundations', 'paid', 'token', '${at}')`,
      `INSERT INTO market_quotes (id, learner_id, course_id, region, agreed_minor, expires_at,
         payload, order_id)
       VALUES ('quote', 'learner', 'ai-foundations', 'us', 4900, '${at}', '{}', 'paid')`,
      `INSERT INTO sponsorships (id, order_id, invoice_number, status, requested_at)
       VALUES ('sponsorship', 'invoiced', 'RW-1', 'sending', '${at}')`,
      `INSERT INTO market_wallets (learner_id, region, budget_minor) VALUES ('learner', 'us', 100)`,
    ],
    'write',
  );
}

async function contents(tables = TABLES): Promise<Record<string, unknown[]>> {
  const entries = await Promise.all(
    tables.map(async (table) => {
      const result = await database.execute(`SELECT * FROM ${table} ORDER BY 1, 2`);
      return [table, result.rows.map((row) => ({ ...row }))] as const;
    }),
  );
  return Object.fromEntries(entries);
}

it('keeps every row and every foreign key while orders learn to be paid from the wallet', async () => {
  await seed();
  const before = await contents();
  await copyFile(path.join(API_MIGRATIONS, WALLET), path.join(migrations, WALLET));
  expect(await migrate(database, { clock, directory: migrations })).toEqual([WALLET]);
  expect(await contents()).toEqual(before);
  expect((await database.execute('PRAGMA foreign_key_check')).rows).toEqual([]);
  await database.execute(
    `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
       status, created_at)
     VALUES ('from-wallet', 'learner', 'ai-for-office-work', 'us', 'wallet', 'USD', 3000,
       'created', '${START.toISOString()}')`,
  );
  await database.execute(
    `INSERT INTO payment_events (order_id, kind, amount_minor, currency, paypal_reference, source,
       occurred_at)
     VALUES ('from-wallet', 'wallet-paid', 3000, 'USD', 'wallet-from-wallet', 'checkout',
       '${START.toISOString()}')`,
  );
  await expect(
    database.execute(
      `INSERT INTO order_items (order_id, course_id, amount_minor) VALUES ('missing', 'x', 1)`,
    ),
  ).rejects.toThrow(/FOREIGN KEY/);
  await expect(database.execute('SELECT * FROM market_wallets')).rejects.toThrow(/no such table/);
});

it('drops the quotes of the retired negotiation and keeps the orders paid at a quoted price', async () => {
  await seed();
  const before = await contents();
  for (const name of await readdir(API_MIGRATIONS)) {
    if (name.endsWith('.sql') && name >= WALLET) {
      await copyFile(path.join(API_MIGRATIONS, name), path.join(migrations, name));
    }
  }
  await migrate(database, { clock, directory: migrations });
  const after = await contents(TABLES.filter((table) => table !== 'market_quotes'));
  expect(after).toEqual({ ...before, market_quotes: undefined });
  await expect(database.execute('SELECT * FROM market_quotes')).rejects.toThrow(/no such table/);
  expect((await database.execute('PRAGMA foreign_key_check')).rows).toEqual([]);
});
