import { randomUUID } from 'node:crypto';

import type { Money, OrderStatus, paymentMethodSchema, Region } from '@rewire/contracts';
import type { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database, Statement } from '../../platform/database.ts';

import type { RefundFact } from './gateway.ts';
import { ORDER_COLUMNS, orderOf, orderRowSchema } from './order-row.ts';
import {
  failedStatements,
  mismatchStatements,
  paidStatements,
  pendingStatements,
  reviewStatements,
  type CaptureFact,
  type PaidFact,
  type ReviewFact,
} from './order-ledger.ts';
import { createPurchaseHolds, holdOnOpening, type PurchaseHolds } from './purchase-holds.ts';
import {
  refundedStatements,
  refundFailedStatements,
  refundRequestedStatements,
  returnedToWalletStatements,
  type RefundedCapture,
} from './refund-ledger.ts';

/** One purchase of one course by one learner. */
export interface Order {
  readonly id: string;
  readonly learnerId: string;
  readonly courseId: string;
  readonly items?: readonly { readonly courseId: string; readonly amountMinor: number }[];
  readonly region: Region;
  readonly method: z.infer<typeof paymentMethodSchema>;
  /** What the server decided to charge when the order was opened. */
  readonly amount: Money;
  readonly status: OrderStatus;
  readonly paypalOrderId: string | undefined;
  readonly paypalCaptureId: string | undefined;
  /** What PayPal captured, when it held the capture or the capture did not match the order. */
  readonly capturedAmount: Money | undefined;
  /** PayPal captured money the order did not ask for: it gives no access and is refunded. */
  readonly captureMismatch: boolean;
  /** The refund asked of PayPal, from the moment PayPal accepts it. */
  readonly refund: RefundRequest | undefined;
  /** Refunds PayPal declined after accepting them: the next one is asked under a new key. */
  readonly refundAttempts: number;
  /** A payment PayPal reported that could not be read with certainty, kept as received. */
  readonly review: PaymentReview | undefined;
  readonly createdAt: string;
  readonly paidAt: string | undefined;
  readonly refundedAt: string | undefined;
}

/** A refund PayPal accepted: `pending` until it sends the money back, then `completed`. */
export interface RefundRequest {
  readonly id: string;
  readonly status: 'pending' | 'completed';
  readonly requestedAt: string;
}

/** Why a payment is in review, and what PayPal sent, as text. */
export interface PaymentReview {
  readonly reason: string;
  readonly status: string | undefined;
  readonly currency: string | undefined;
  readonly value: string | undefined;
}

export type NewOrder = Pick<
  Order,
  'learnerId' | 'courseId' | 'region' | 'method' | 'amount' | 'items'
>;

/** Where a fact about an order came from. */
export type SettlementSource = 'checkout' | 'webhook' | 'reconciliation';

/**
 * Orders and their ledger.
 *
 * Every change of state is one transaction that moves the order and, only when it moves, appends
 * its ledger row and changes its enrolment and its hold. Recording the same fact twice, or late,
 * changes nothing: PayPal may tell us about a payment through the checkout, a webhook and a
 * later reconciliation, in any order.
 */
export interface OrderStore extends PurchaseHolds {
  /** Stores an order of a PayPal payment. It holds no course until it is captured. */
  open(order: NewOrder): Promise<Order>;
  /** Links the order to the one PayPal opened for it. */
  attachPayPalOrder(orderId: string, paypalOrderId: string): Promise<void>;
  find(orderId: string): Promise<Order | undefined>;
  findByPayPalOrder(paypalOrderId: string): Promise<Order | undefined>;
  findByCapture(captureId: string): Promise<Order | undefined>;
  listByLearner(learnerId: string): Promise<Order[]>;
  /**
   * The money arrived: the order is paid and the learner is enrolled, when it is exactly what the
   * order asked for. Refunds PayPal reports done on it are recorded with it.
   */
  recordPaid(order: Order, paid: PaidFact, source: SettlementSource): Promise<void>;
  /** PayPal holds the money. No access is given. */
  recordPending(order: Order, capture: CaptureFact, source: SettlementSource): Promise<void>;
  /** PayPal captured what the order did not ask for. No access is given; the course stays held. */
  recordMismatch(
    order: Order,
    capture: CaptureFact & { readonly refunds: readonly RefundFact[] },
    source: SettlementSource,
  ): Promise<void>;
  /** PayPal reported a payment that cannot be read with certainty: kept, held, no access. */
  recordReview(order: Order, review: ReviewFact, source: SettlementSource): Promise<void>;
  recordFailed(order: Order, reason: string, source: SettlementSource): Promise<void>;
  /** PayPal accepted a refund it has not completed. Nothing else changes yet. */
  recordRefundRequested(order: Order, refundId: string, source: SettlementSource): Promise<void>;
  /** PayPal declined a refund it had accepted: the order is as before it was asked. */
  recordRefundFailed(order: Order, refundId: string, source: SettlementSource): Promise<void>;
  /**
   * The money of its capture went back: the order is refunded, its hold let go and its enrolment
   * revoked, whether the course was in progress or completed, and whether the capture was last
   * known completed or still held. Access follows payment; a certificate already issued stays
   * valid, because it attests what was learnt. With the capture PayPal reports refunded, one never
   * seen before is recorded first, with what PayPal says it took and gave back.
   */
  recordRefunded(order: Order, source: SettlementSource, capture?: RefundedCapture): Promise<void>;
  /** An order paid from the wallet is refunded: its money is back in the wallet, its access gone. */
  recordReturnedToWallet(order: Order): Promise<void>;
}

export function createOrderStore(database: Database, clock: Clock): OrderStore {
  const findWhere = async (condition: string, value: string): Promise<Order | undefined> => {
    const result = await database.execute(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE ${condition} = ?`,
      [value],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : orderOf(orderRowSchema.parse(row));
  };
  /** Applies one change of state, ledger row included, as a single transaction. */
  const record = async (statements: (at: string) => Statement[]): Promise<void> => {
    await database.batch(statements(clock().toISOString()), 'write');
  };

  return {
    ...createPurchaseHolds(database, clock),
    async open(order) {
      const opened = newOrderOf(order, clock().toISOString());
      await database.batch([insertOrder(opened), ...itemStatements(opened)], 'write');
      return opened;
    },
    attachPayPalOrder: (orderId, paypalOrderId) =>
      record((at) => attachStatements(orderId, paypalOrderId, at)),
    find: (orderId) => findWhere('id', orderId),
    findByPayPalOrder: (paypalOrderId) => findWhere('paypal_order_id', paypalOrderId),
    findByCapture: (captureId) => findWhere('paypal_capture_id', captureId),
    async listByLearner(learnerId) {
      const result = await database.execute(
        `SELECT ${ORDER_COLUMNS} FROM orders WHERE learner_id = ? ORDER BY created_at DESC`,
        [learnerId],
      );
      return result.rows.map((row) => orderOf(orderRowSchema.parse(row)));
    },
    recordPaid: (order, paid, source) => record((at) => paidStatements(order, paid, source, at)),
    recordPending: (order, capture, source) =>
      record((at) => pendingStatements(order, capture, source, at)),
    recordMismatch: (order, capture, source) =>
      record((at) => mismatchStatements(order, capture, source, at)),
    recordReview: (order, review, source) =>
      record((at) => reviewStatements(order, review, source, at)),
    recordFailed: (order, reason, source) =>
      record((at) => failedStatements(order, reason, source, at)),
    recordRefundRequested: (order, refundId, source) =>
      record((at) => refundRequestedStatements(order, refundId, source, at)),
    recordRefundFailed: (order, refundId, source) =>
      record((at) => refundFailedStatements(order, refundId, source, at)),
    recordRefunded: (order, source, capture) =>
      record((at) => refundedStatements(order, source, at, capture)),
    recordReturnedToWallet: (order) => record((at) => returnedToWalletStatements(order, at)),
  };
}

/**
 * The writes that store a new order that holds its courses at once, as an invoice or a payment
 * from the wallet does. They fail together when another order holds one of the courses.
 */
export function openingStatements(order: NewOrder, at: string): [Order, Statement[]] {
  const opened = newOrderOf(order, at);
  const courseIds = opened.items?.map((item) => item.courseId) ?? [opened.courseId];
  return [
    opened,
    [
      insertOrder(opened),
      ...itemStatements(opened),
      ...courseIds.map((courseId) => holdOnOpening({ ...opened, courseId }, at)),
    ],
  ];
}

function itemStatements(order: Order): Statement[] {
  return (order.items ?? []).map((item) => ({
    sql: 'INSERT INTO order_items (order_id, course_id, amount_minor) VALUES (?, ?, ?)',
    args: [order.id, item.courseId, item.amountMinor],
  }));
}

function newOrderOf(order: NewOrder, createdAt: string): Order {
  return {
    ...order,
    id: randomUUID(),
    status: 'created',
    paypalOrderId: undefined,
    paypalCaptureId: undefined,
    capturedAmount: undefined,
    captureMismatch: false,
    refund: undefined,
    refundAttempts: 0,
    review: undefined,
    createdAt,
    paidAt: undefined,
    refundedAt: undefined,
  };
}

function insertOrder(order: Order): Statement {
  return {
    sql: `INSERT INTO orders
            (id, learner_id, course_id, region, method, currency, amount_minor, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?)`,
    args: [
      order.id,
      order.learnerId,
      order.courseId,
      order.region,
      order.method,
      order.amount.currency,
      order.amount.minorUnits,
      order.createdAt,
    ],
  };
}

function attachStatements(orderId: string, paypalOrderId: string, at: string): Statement[] {
  return [
    { sql: 'UPDATE orders SET paypal_order_id = ? WHERE id = ?', args: [paypalOrderId, orderId] },
    {
      sql: `INSERT OR IGNORE INTO payment_events
              (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
            SELECT id, 'order-opened', 0, currency, ?, 'checkout', ? FROM orders WHERE id = ?`,
      args: [paypalOrderId, at, orderId],
    },
  ];
}
