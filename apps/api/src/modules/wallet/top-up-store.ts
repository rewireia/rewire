import { randomUUID } from 'node:crypto';

import {
  currencySchema,
  regionSchema,
  topUpStatusSchema,
  type Money,
  type Region,
  type TopUpStatus,
} from '@rewire/contracts';
import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';

/** Money a learner asked to add to their wallet with PayPal. */
export interface TopUp {
  readonly id: string;
  readonly learnerId: string;
  readonly region: Region;
  /** What the server asked PayPal to charge. */
  readonly amount: Money;
  readonly status: TopUpStatus;
  readonly paypalOrderId: string | undefined;
  readonly paypalCaptureId: string | undefined;
  /** The refund asked of PayPal for a capture that did not match. */
  readonly refundId: string | undefined;
  readonly createdAt: string;
  readonly completedAt: string | undefined;
}

/** A capture as PayPal reported it for a top-up. */
interface CaptureFact {
  readonly captureId: string;
  readonly amount: Money;
}

const topUpRowSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  region: regionSchema,
  currency: currencySchema,
  amount_minor: z.number().int(),
  status: topUpStatusSchema,
  paypal_order_id: z.string().nullable(),
  paypal_capture_id: z.string().nullable(),
  refund_id: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

const COLUMNS = `id, learner_id, region, currency, amount_minor, status, paypal_order_id,
  paypal_capture_id, refund_id, created_at, completed_at`;

/**
 * Top-ups and how each stands. Every change is one conditional write: it moves a top-up only from
 * a state the fact may change, so a fact reported again, or late, changes nothing.
 */
export interface TopUpStore {
  open(learnerId: string, region: Region, amount: Money): Promise<TopUp>;
  attachPayPalOrder(id: string, paypalOrderId: string): Promise<void>;
  find(id: string): Promise<TopUp | undefined>;
  findByPayPalOrder(paypalOrderId: string): Promise<TopUp | undefined>;
  /** The learner's top-ups in a region that left `created`, newest first. */
  listMoved(learnerId: string, region: Region): Promise<TopUp[]>;
  /** Top-ups still waiting on PayPal: held, or not matching and not given back yet. */
  listUnsettled(learnerId: string, region: Region): Promise<TopUp[]>;
  /** PayPal captured exactly what was asked: the money is in the balance. */
  recordCompleted(topUp: TopUp, capture: CaptureFact): Promise<void>;
  recordPending(topUp: TopUp, captureId: string | undefined): Promise<void>;
  recordFailed(topUp: TopUp): Promise<void>;
  /** PayPal captured something else: it never adds to the balance and is given back. */
  recordMismatched(topUp: TopUp, capture: CaptureFact): Promise<void>;
  recordRefundAsked(topUp: TopUp, refundId: string): Promise<void>;
  /** The money of a capture that never counted went back to the buyer. */
  recordRefunded(topUp: TopUp): Promise<void>;
}

/** The writes that settle a top-up, each moving it only from the states the fact may change. */
const WRITES = {
  completed: `UPDATE wallet_top_ups
      SET status = 'completed', paypal_capture_id = ?, captured_minor = ?, captured_currency = ?,
          completed_at = ?
    WHERE id = ? AND status IN ('created', 'pending') AND currency = ? AND amount_minor = ?`,
  pending: `UPDATE wallet_top_ups
      SET status = 'pending', paypal_capture_id = COALESCE(?, paypal_capture_id)
    WHERE id = ? AND status IN ('created', 'pending')`,
  failed: `UPDATE wallet_top_ups SET status = 'failed', completed_at = ?
    WHERE id = ? AND status IN ('created', 'pending')`,
  mismatched: `UPDATE wallet_top_ups
      SET status = 'mismatched', paypal_capture_id = ?, captured_minor = ?, captured_currency = ?
    WHERE id = ? AND status IN ('created', 'pending')`,
  refundAsked: `UPDATE wallet_top_ups SET refund_id = ?
    WHERE id = ? AND status = 'mismatched' AND refund_id IS NULL`,
  refunded: `UPDATE wallet_top_ups SET status = 'refunded', completed_at = ?
    WHERE id = ? AND status IN ('created', 'pending', 'mismatched')`,
} as const;

type Write = (sql: string, args: (string | number | null)[]) => Promise<void>;

export function createTopUpStore(database: Database, clock: Clock): TopUpStore {
  const write: Write = async (sql, args) => {
    await database.execute({ sql, args });
  };
  return {
    ...topUpReads(database),
    ...openingWrites(write, clock),
    ...settlingWrites(write, () => clock().toISOString()),
  };
}

type Reads = 'find' | 'findByPayPalOrder' | 'listMoved' | 'listUnsettled';

function topUpReads(database: Database): Pick<TopUpStore, Reads> {
  const findWhere = async (column: 'id' | 'paypal_order_id', value: string) => {
    const result = await database.execute({
      sql: `SELECT ${COLUMNS} FROM wallet_top_ups WHERE ${column} = ?`,
      args: [value],
    });
    const row = result.rows[0];
    return row === undefined ? undefined : topUpOf(topUpRowSchema.parse(row));
  };
  const list = async (condition: string, learnerId: string, region: Region) => {
    const result = await database.execute({
      sql: `SELECT ${COLUMNS} FROM wallet_top_ups
             WHERE learner_id = ? AND region = ? AND ${condition}
             ORDER BY created_at DESC`,
      args: [learnerId, region],
    });
    return result.rows.map((row) => topUpOf(topUpRowSchema.parse(row)));
  };
  return {
    find: (id) => findWhere('id', id),
    findByPayPalOrder: (paypalOrderId) => findWhere('paypal_order_id', paypalOrderId),
    listMoved: (learnerId, region) => list("status <> 'created'", learnerId, region),
    listUnsettled: (learnerId, region) =>
      list("status IN ('pending', 'mismatched')", learnerId, region),
  };
}

function openingWrites(write: Write, clock: Clock): Pick<TopUpStore, 'open' | 'attachPayPalOrder'> {
  return {
    async open(learnerId, region, amount) {
      const topUp: TopUp = {
        id: randomUUID(),
        learnerId,
        region,
        amount,
        status: 'created',
        paypalOrderId: undefined,
        paypalCaptureId: undefined,
        refundId: undefined,
        createdAt: clock().toISOString(),
        completedAt: undefined,
      };
      await write(
        `INSERT INTO wallet_top_ups
           (id, learner_id, region, currency, amount_minor, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'created', ?)`,
        [topUp.id, learnerId, region, amount.currency, amount.minorUnits, topUp.createdAt],
      );
      return topUp;
    },
    attachPayPalOrder: (id, paypalOrderId) =>
      write('UPDATE wallet_top_ups SET paypal_order_id = ? WHERE id = ?', [paypalOrderId, id]),
  };
}

function settlingWrites(
  write: Write,
  now: () => string,
): Omit<TopUpStore, Reads | 'open' | 'attachPayPalOrder'> {
  return {
    recordCompleted: ({ id }, { captureId, amount: { currency, minorUnits } }) =>
      write(WRITES.completed, [captureId, minorUnits, currency, now(), id, currency, minorUnits]),
    recordPending: ({ id }, captureId) => write(WRITES.pending, [captureId ?? null, id]),
    recordFailed: ({ id }) => write(WRITES.failed, [now(), id]),
    recordMismatched: ({ id }, { captureId, amount }) =>
      write(WRITES.mismatched, [captureId, amount.minorUnits, amount.currency, id]),
    recordRefundAsked: ({ id }, refundId) => write(WRITES.refundAsked, [refundId, id]),
    recordRefunded: ({ id }) => write(WRITES.refunded, [now(), id]),
  };
}

function topUpOf(row: z.infer<typeof topUpRowSchema>): TopUp {
  return {
    id: row.id,
    learnerId: row.learner_id,
    region: row.region,
    amount: { currency: row.currency, minorUnits: row.amount_minor },
    status: row.status,
    paypalOrderId: row.paypal_order_id ?? undefined,
    paypalCaptureId: row.paypal_capture_id ?? undefined,
    refundId: row.refund_id ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}
