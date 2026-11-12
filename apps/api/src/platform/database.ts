import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient, type Client, type InStatement } from '@libsql/client';
import { z } from 'zod';

import type { Clock } from './clock.ts';

/** The SQL client every store uses. */
export type Database = Client;

/** One SQL statement with its arguments, as `execute` and `batch` take it. */
export type Statement = InStatement;

const appliedMigrationSchema = z.object({ name: z.string(), checksum: z.string() });

/** The folder of the API package: relative database files are kept under it. */
const PACKAGE_DIRECTORY = fileURLToPath(new URL('../../', import.meta.url));
const MIGRATIONS_DIRECTORY = path.join(PACKAGE_DIRECTORY, 'migrations');

/** A migration already applied no longer matches the file it came from. */
export class MigrationError extends Error {
  override readonly name = 'MigrationError';
}

/**
 * Opens the database. A relative `file:` address is resolved against the API package, so
 * the server uses the same file whatever folder it is started from.
 */
export async function openDatabase(url: string): Promise<Database> {
  const database = createClient({ url: await resolvedUrl(url) });
  // SQLite checks foreign keys only when asked to, and the setting belongs to the connection:
  // every database is asked, in memory, in a file or remote.
  await database.execute('PRAGMA foreign_keys = ON');
  return database;
}

/** The address to open: a local file made absolute, with its folder created; others as given. */
async function resolvedUrl(url: string): Promise<string> {
  const file = localFileOf(url);
  if (file === undefined) {
    return url;
  }
  const absolute = path.resolve(PACKAGE_DIRECTORY, file);
  await mkdir(path.dirname(absolute), { recursive: true });
  return `file:${absolute}`;
}

/** The path of a `file:` address, or `undefined` for memory and remote databases. */
function localFileOf(url: string): string | undefined {
  return url.startsWith('file:') && !url.includes(':memory:')
    ? url.slice('file:'.length)
    : undefined;
}

interface MigrateOptions {
  /** Dates each migration as it is applied, so a test sees the time it set. */
  readonly clock: Clock;
  readonly directory?: string;
}

/**
 * Applies the migrations not applied yet, in name order, each in its own transaction.
 * Returns the names it applied.
 */
export async function migrate(
  database: Database,
  { clock, directory = MIGRATIONS_DIRECTORY }: MigrateOptions,
): Promise<string[]> {
  await database.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
     ) STRICT`,
  );
  const known = await database.execute('SELECT name, checksum FROM schema_migrations');
  const checksums = new Map(
    known.rows.map((row) => {
      const { name, checksum } = appliedMigrationSchema.parse(row);
      return [name, checksum];
    }),
  );

  const applied: string[] = [];
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).toSorted();
  for (const name of names) {
    const sql = await readFile(path.join(directory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const recorded = checksums.get(name);
    if (recorded === undefined) {
      await database.batch(
        [
          ...statementsOf(sql),
          {
            sql: 'INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)',
            args: [name, checksum, clock().toISOString()],
          },
        ],
        'write',
      );
      applied.push(name);
    } else if (recorded !== checksum) {
      throw new MigrationError(
        `${name} changed after it was applied: write a new migration instead`,
      );
    }
  }
  return applied;
}

/** Splits a migration file into its statements, leaving comments out. */
function statementsOf(sql: string): string[] {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
}
