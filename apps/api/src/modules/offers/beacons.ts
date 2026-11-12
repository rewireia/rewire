import { randomUUID } from 'node:crypto';

import {
  discountBeaconSchema,
  type DiscountBeacon,
  type DiscountBeaconInput,
  type DiscountBeaconStatus,
  type Region,
} from '@rewire/contracts';
import { z } from 'zod';

import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Database, Statement } from '../../platform/database.ts';

const rowSchema = z.object({
  id: z.string(),
  region: z.enum(['eu', 'us', 'uk']),
  percent: z.number().int(),
  starts_at: z.string(),
  ends_at: z.string(),
  created_at: z.string(),
  cancelled_at: z.string().nullable(),
});
type Row = z.infer<typeof rowSchema>;

type Reader = Pick<Database, 'execute'>;

/** A beacon that runs or will run at some instant from now on, of the region, not cancelled. */
const LIVE = 'region = ? AND cancelled_at IS NULL AND ends_at > ?';

const conflict = (title: string) =>
  new HttpProblem({ status: 409, code: 'beacon_conflict', title });

function statusOf(row: Row, now: string): DiscountBeaconStatus {
  if (row.cancelled_at !== null) return 'cancelled';
  if (row.ends_at <= now) return 'ended';
  return row.starts_at <= now ? 'active' : 'scheduled';
}

function beaconOf(row: Row, now: string): DiscountBeacon {
  return discountBeaconSchema.parse({
    id: row.id,
    region: row.region,
    percent: row.percent,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: statusOf(row, now),
    createdAt: row.created_at,
  });
}

/** The beacon running in a region at an instant, if one does. */
export async function activeBeacon(
  database: Reader,
  region: Region,
  now: Date,
): Promise<DiscountBeacon | undefined> {
  const at = now.toISOString();
  const result = await database.execute({
    sql: `SELECT * FROM discount_beacons WHERE ${LIVE} AND starts_at <= ?
          ORDER BY starts_at DESC LIMIT 1`,
    args: [region, at, at],
  });
  const row = result.rows[0];
  return row === undefined ? undefined : beaconOf(rowSchema.parse(row), at);
}

/**
 * The price of a course while a beacon takes a percentage off it, in whole minor units and
 * never below one.
 */
export function discounted(priceMinor: number, percent: number): number {
  return Math.max(1, Math.round((priceMinor * (100 - percent)) / 100));
}

async function foundBeacon(database: Reader, id: string, now: Date): Promise<DiscountBeacon> {
  const result = await database.execute({
    sql: 'SELECT * FROM discount_beacons WHERE id = ?',
    args: [id],
  });
  const row = result.rows[0];
  if (row === undefined) throw notFound('A discount beacon with that id');
  return beaconOf(rowSchema.parse(row), now.toISOString());
}

/**
 * The seller's discount beacons. At most one live beacon per region: a new one may not overlap
 * one that runs or is scheduled, which is checked in the transaction that writes it.
 */
export function createBeacons(database: Database, clock: Clock) {
  async function list(region: Region): Promise<DiscountBeacon[]> {
    const now = clock().toISOString();
    const result = await database.execute({
      sql: 'SELECT * FROM discount_beacons WHERE region = ? ORDER BY starts_at DESC LIMIT 50',
      args: [region],
    });
    return result.rows.map((row) => beaconOf(rowSchema.parse(row), now));
  }

  async function create(input: DiscountBeaconInput): Promise<DiscountBeacon> {
    const now = clock();
    const startsAt = new Date(Math.max(Date.parse(input.startsAt), now.getTime())).toISOString();
    const endsAt = new Date(input.endsAt).toISOString();
    if (endsAt <= startsAt) throw conflict('A beacon must end in the future');
    const id = randomUUID();
    const insert: Statement = {
      sql: `INSERT INTO discount_beacons (id, region, percent, starts_at, ends_at, created_at)
            SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (
              SELECT 1 FROM discount_beacons WHERE ${LIVE} AND starts_at < ? AND ends_at > ?)`,
      args: [
        id,
        input.region,
        input.percent,
        startsAt,
        endsAt,
        now.toISOString(),
        input.region,
        now.toISOString(),
        endsAt,
        startsAt,
      ],
    };
    const [written] = await database.batch([insert], 'write');
    if (written?.rowsAffected !== 1) {
      throw conflict('Another discount beacon runs or is scheduled at that time in this region');
    }
    return foundBeacon(database, id, clock());
  }

  async function cancel(id: string): Promise<DiscountBeacon> {
    const now = clock().toISOString();
    await database.execute({
      sql: 'UPDATE discount_beacons SET cancelled_at = ? WHERE id = ? AND cancelled_at IS NULL AND ends_at > ?',
      args: [now, id, now],
    });
    return foundBeacon(database, id, clock());
  }

  return {
    list,
    create,
    cancel,
    active: (region: Region) => activeBeacon(database, region, clock()),
  };
}

export type Beacons = ReturnType<typeof createBeacons>;
