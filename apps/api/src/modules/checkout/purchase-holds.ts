import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database, Statement } from '../../platform/database.ts';

/** The one order that may be paid for a learner's course, and the call that took it. */
export interface Hold {
  readonly orderId: string;
  /** Names the call that took the hold: only that call may let it go. */
  readonly token: string;
  readonly takenAt: string;
}

/** Whom a hold is for. */
interface HoldKey {
  readonly id: string;
  readonly learnerId: string;
  readonly courseId: string;
}

const holdRowSchema = z.object({ order_id: z.string(), token: z.string(), taken_at: z.string() });

/**
 * One attempt to pay per learner and course, kept by the database: the key of `purchase_holds`
 * is the learner and the course, so two orders cannot hold the same course at once.
 */
export interface PurchaseHolds {
  /**
   * Takes the course for this order, or takes it again with a new token when the order holds it
   * already. Returns `undefined` when another order holds it.
   */
  takeHold(order: HoldKey): Promise<Hold | undefined>;
  holderOf(learnerId: string, courseId: string): Promise<Hold | undefined>;
  /** Lets the course go, unless another call has taken the hold again since. */
  releaseHold(hold: Hold): Promise<void>;
}

export function createPurchaseHolds(database: Database, clock: Clock): PurchaseHolds {
  return {
    async takeHold(order) {
      const hold = { orderId: order.id, token: randomUUID(), takenAt: clock().toISOString() };
      const result = await database.execute({
        sql: `INSERT INTO purchase_holds (learner_id, course_id, order_id, token, taken_at)
              SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status IN ('created', 'pending'))
              ON CONFLICT (learner_id, course_id) DO UPDATE
                SET token = excluded.token, taken_at = excluded.taken_at
              WHERE purchase_holds.order_id = excluded.order_id
              RETURNING order_id`,
        args: [order.learnerId, order.courseId, hold.orderId, hold.token, hold.takenAt, order.id],
      });
      return result.rows.length === 1 ? hold : undefined;
    },
    async holderOf(learnerId, courseId) {
      const result = await database.execute(
        'SELECT order_id, token, taken_at FROM purchase_holds WHERE learner_id = ? AND course_id = ?',
        [learnerId, courseId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        return undefined;
      }
      const { order_id: orderId, token, taken_at: takenAt } = holdRowSchema.parse(row);
      return { orderId, token, takenAt };
    },
    async releaseHold({ orderId, token }) {
      await database.execute('DELETE FROM purchase_holds WHERE order_id = ? AND token = ?', [
        orderId,
        token,
      ]);
    },
  };
}

/**
 * Takes the course for a new order in the transaction that opens it. It fails, and with it the
 * transaction, when another order holds the course.
 */
export function holdOnOpening(order: HoldKey, at: string): Statement {
  return {
    sql: `INSERT INTO purchase_holds (learner_id, course_id, order_id, token, taken_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [order.learnerId, order.courseId, order.id, randomUUID(), at],
  };
}

/**
 * An order PayPal reports paid or holding money keeps the course, even when PayPal learnt of the
 * payment before Rewire took the hold. Nothing changes when the course is already held.
 */
export function holdOnceSettled(orderId: string, at: string): Statement {
  return {
    sql: `INSERT OR IGNORE INTO purchase_holds (learner_id, course_id, order_id, token, taken_at)
          SELECT o.learner_id, COALESCE(i.course_id, o.course_id), o.id, ?, ? FROM orders o
          LEFT JOIN order_items i ON i.order_id = o.id
           WHERE o.id = ? AND o.status IN ('pending', 'completed')`,
    args: [randomUUID(), at, orderId],
  };
}

/** An order that ended without money, or whose money went back, lets the course go. */
export function releaseOnceEnded(orderId: string): Statement {
  return {
    sql: `DELETE FROM purchase_holds
           WHERE order_id = ?
             AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status IN ('failed', 'refunded'))`,
    args: [orderId, orderId],
  };
}

/** Whether an error is the database refusing a second hold of a course. */
export function isHeldElsewhere(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('SQLITE_CONSTRAINT')
  );
}
