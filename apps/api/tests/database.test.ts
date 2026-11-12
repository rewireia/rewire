import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { migrate, MigrationError, openDatabase, type Database } from '../src/platform/database.ts';

import { START } from './support/test-api.ts';

const clock = () => START;
const API_MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url));

let directory: string;
let migrations: string;
let database: Database;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'rewire-migrations-'));
  migrations = path.join(directory, 'migrations');
  await mkdir(migrations);
  database = await openDatabase(`file:${path.join(directory, 'test.db')}`);
});

afterEach(async () => {
  database.close();
  await rm(directory, { recursive: true, force: true });
});

const writeMigration = async (name: string, sql: string) => {
  await writeFile(path.join(migrations, name), sql);
};

describe('migrations', () => {
  beforeEach(async () => {
    await writeMigration('0002_second.sql', 'ALTER TABLE things ADD COLUMN size INTEGER;');
    await writeMigration(
      '0001_first.sql',
      '-- Things.\nCREATE TABLE things (id TEXT PRIMARY KEY);',
    );
  });

  it('are applied in name order', async () => {
    expect(await migrate(database, { clock, directory: migrations })).toEqual([
      '0001_first.sql',
      '0002_second.sql',
    ]);
    await database.execute("INSERT INTO things (id, size) VALUES ('a', 1)");
  });

  it('are applied once', async () => {
    await migrate(database, { clock, directory: migrations });
    expect(await migrate(database, { clock, directory: migrations })).toEqual([]);
  });

  it('refuse to run when an applied one has changed', async () => {
    await migrate(database, { clock, directory: migrations });
    await writeMigration('0001_first.sql', 'CREATE TABLE things (id TEXT);');
    await expect(migrate(database, { clock, directory: migrations })).rejects.toThrow(
      MigrationError,
    );
  });

  it('of the API build its schema', async () => {
    expect(await migrate(database, { clock })).toEqual([
      '0001_initial.sql',
      '0002_study_plans.sql',
      '0003_purchase_holds.sql',
      '0004_capture_and_refund_facts.sql',
      '0005_review_and_refund_cycle.sql',
      '0006_marketplace.sql',
      '0007_demo_identity.sql',
      '0008_course_baskets.sql',
      '0009_learning_roadmap.sql',
      '0010_wallet.sql',
      '0011_retire_quotes.sql',
      '0012_seller_courses_and_beacons.sql',
    ]);
    const tables = await database.execute(
      "SELECT name FROM sqlite_master WHERE name IN ('certificates', 'study_plans', 'purchase_holds')",
    );
    expect(tables.rows).toHaveLength(3);
  });

  it('of purchase holds keep the requests sent and hold the courses already paid or invoiced', async () => {
    for (const name of ['0001_initial.sql', '0002_study_plans.sql']) {
      await copyFile(path.join(API_MIGRATIONS, name), path.join(migrations, name));
    }
    await rm(path.join(migrations, '0002_second.sql'));
    await rm(path.join(migrations, '0001_first.sql'));
    await migrate(database, { clock, directory: migrations });
    await database.batch(
      [
        "INSERT INTO learners (id, created_at) VALUES ('l', '2026-11-01')",
        `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
           status, created_at) VALUES
           ('paid', 'l', 'a', 'us', 'paypal', 'USD', 4900, 'completed', '2026-11-01'),
           ('again', 'l', 'a', 'us', 'paypal', 'USD', 4900, 'completed', '2026-11-02'),
           ('invoiced', 'l', 'b', 'us', 'employer-invoice', 'USD', 1900, 'created', '2026-11-03'),
           ('opened', 'l', 'c', 'us', 'paypal', 'USD', 1900, 'created', '2026-11-04')`,
        `INSERT INTO sponsorships (id, order_id, invoice_id, invoice_number, status, sent_at)
           VALUES ('s', 'invoiced', 'INV2-1', '0001', 'sent', '2026-11-03')`,
      ],
      'write',
    );
    await copyFile(
      path.join(API_MIGRATIONS, '0003_purchase_holds.sql'),
      path.join(migrations, '0003_purchase_holds.sql'),
    );
    expect(await migrate(database, { clock, directory: migrations })).toEqual([
      '0003_purchase_holds.sql',
    ]);
    const holds = await database.execute(
      'SELECT course_id, order_id FROM purchase_holds ORDER BY course_id',
    );
    expect(holds.rows.map((row) => [row['course_id'], row['order_id']])).toEqual([
      ['a', 'paid'],
      ['b', 'invoiced'],
    ]);
    const kept = await database.execute(
      'SELECT invoice_id, status, requested_at FROM sponsorships',
    );
    expect(kept.rows.map((row) => Object.values(row))).toEqual([['INV2-1', 'sent', '2026-11-03']]);
  });

  it('of capture and refund facts keep the ledger and give a held order its capture', async () => {
    for (const name of ['0001_initial.sql', '0002_study_plans.sql', '0003_purchase_holds.sql']) {
      await copyFile(path.join(API_MIGRATIONS, name), path.join(migrations, name));
    }
    await rm(path.join(migrations, '0002_second.sql'));
    await rm(path.join(migrations, '0001_first.sql'));
    await migrate(database, { clock, directory: migrations });
    await database.batch(
      [
        "INSERT INTO learners (id, created_at) VALUES ('l', '2026-11-01')",
        `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
           status, paypal_capture_id, created_at) VALUES
           ('held', 'l', 'a', 'us', 'paypal', 'USD', 1900, 'pending', NULL, '2026-11-01'),
           ('paid', 'l', 'b', 'us', 'paypal', 'USD', 4900, 'completed', 'CAP-2', '2026-11-02')`,
        `INSERT INTO payment_events
           (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at) VALUES
           ('held', 'capture-pending', 0, 'USD', 'CAP-1', 'checkout', '2026-11-01'),
           ('paid', 'capture-completed', 4900, 'USD', 'CAP-2', 'checkout', '2026-11-02')`,
      ],
      'write',
    );
    await copyFile(
      path.join(API_MIGRATIONS, '0004_capture_and_refund_facts.sql'),
      path.join(migrations, '0004_capture_and_refund_facts.sql'),
    );
    expect(await migrate(database, { clock, directory: migrations })).toEqual([
      '0004_capture_and_refund_facts.sql',
    ]);
    const orders = await database.execute(
      'SELECT id, paypal_capture_id, capture_mismatch, refund_id FROM orders ORDER BY id',
    );
    expect(orders.rows.map((row) => Object.values(row))).toEqual([
      ['held', 'CAP-1', 0, null],
      ['paid', 'CAP-2', 0, null],
    ]);
    const ledger = await database.execute(
      'SELECT id, order_id, kind, amount_minor FROM payment_events ORDER BY id',
    );
    expect(ledger.rows.map((row) => Object.values(row))).toEqual([
      [1, 'held', 'capture-pending', 0],
      [2, 'paid', 'capture-completed', 4900],
    ]);
    await database.execute(
      `INSERT INTO payment_events
         (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
       VALUES ('paid', 'refund-requested', 0, 'USD', 'REF-1', 'checkout', '2026-11-03')`,
    );
  });

  it('of review and refund cycle keep orders, requests and the ledger as they were', async () => {
    const earlier = [
      '0001_initial.sql',
      '0002_study_plans.sql',
      '0003_purchase_holds.sql',
      '0004_capture_and_refund_facts.sql',
    ];
    for (const name of earlier) {
      await copyFile(path.join(API_MIGRATIONS, name), path.join(migrations, name));
    }
    await rm(path.join(migrations, '0002_second.sql'));
    await rm(path.join(migrations, '0001_first.sql'));
    await migrate(database, { clock, directory: migrations });
    await database.batch(
      [
        "INSERT INTO learners (id, created_at) VALUES ('l', '2026-11-01')",
        `INSERT INTO orders (id, learner_id, course_id, region, method, currency, amount_minor,
           status, paypal_capture_id, refund_id, refund_status, created_at) VALUES
           ('paid', 'l', 'a', 'us', 'paypal', 'USD', 4900, 'completed', 'CAP-1', 'REF-1',
            'pending', '2026-11-01'),
           ('invoiced', 'l', 'b', 'us', 'employer-invoice', 'USD', 1900, 'created', NULL, NULL,
            NULL, '2026-11-02')`,
        `INSERT INTO sponsorships (id, order_id, invoice_id, invoice_number, status, requested_at)
           VALUES ('s', 'invoiced', 'INV2-1', '0001', 'sent', '2026-11-02')`,
        `INSERT INTO payment_events
           (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at) VALUES
           ('paid', 'capture-completed', 4900, 'USD', 'CAP-1', 'checkout', '2026-11-01'),
           ('paid', 'refund-requested', 0, 'USD', 'REF-1', 'checkout', '2026-11-03')`,
      ],
      'write',
    );
    await copyFile(
      path.join(API_MIGRATIONS, '0005_review_and_refund_cycle.sql'),
      path.join(migrations, '0005_review_and_refund_cycle.sql'),
    );
    expect(await migrate(database, { clock, directory: migrations })).toEqual([
      '0005_review_and_refund_cycle.sql',
    ]);
    const orders = await database.execute(
      'SELECT id, refund_id, refund_attempts, review_reason FROM orders ORDER BY id',
    );
    expect(orders.rows.map((row) => Object.values(row))).toEqual([
      ['invoiced', null, 0, null],
      ['paid', 'REF-1', 0, null],
    ]);
    const kept = await database.execute('SELECT id, invoice_id, status FROM sponsorships');
    expect(kept.rows.map((row) => Object.values(row))).toEqual([['s', 'INV2-1', 'sent']]);
    const ledger = await database.execute('SELECT id, kind, amount_minor FROM payment_events');
    expect(ledger.rows.map((row) => Object.values(row))).toEqual([
      [1, 'capture-completed', 4900],
      [2, 'refund-requested', 0],
    ]);
    await database.batch(
      [
        "UPDATE sponsorships SET status = 'review' WHERE id = 's'",
        `INSERT INTO payment_events
           (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at) VALUES
           ('paid', 'refund-failed', 0, 'USD', 'REF-1', 'webhook', '2026-11-04'),
           ('paid', 'refund-partial', -100, 'USD', 'REF-2', 'webhook', '2026-11-04'),
           ('paid', 'capture-review', 0, 'USD', 'CAP-1', 'webhook', '2026-11-04'),
           ('invoiced', 'invoice-review', 0, 'USD', 'INV2-1', 'webhook', '2026-11-04')`,
      ],
      'write',
    );
  });

  it('are dated by the clock they are given', async () => {
    await migrate(database, { clock, directory: migrations });
    const applied = await database.execute('SELECT DISTINCT applied_at FROM schema_migrations');
    expect(applied.rows.map((row) => row['applied_at'])).toEqual([START.toISOString()]);
  });
});

describe('a database', () => {
  const foreignKeysOf = async (opened: Database) =>
    (await opened.execute('PRAGMA foreign_keys')).rows[0]?.['foreign_keys'];

  it('checks foreign keys in a file', async () => {
    expect(await foreignKeysOf(database)).toBe(1);
  });

  it('checks foreign keys in memory too', async () => {
    const memory = await openDatabase(':memory:');
    try {
      expect(await foreignKeysOf(memory)).toBe(1);
      await migrate(memory, { clock });
      await expect(
        memory.execute(
          `INSERT INTO enrolments (id, learner_id, course_id, order_id, status, started_at)
           VALUES ('e', 'nobody', 'c', 'no-order', 'active', '2026-11-11')`,
        ),
      ).rejects.toThrow(/FOREIGN KEY/);
    } finally {
      memory.close();
    }
  });
});
