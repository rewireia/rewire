import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database, Statement } from '../../platform/database.ts';
import {
  paidStatements,
  reviewStatements,
  type PaidFact,
  type ReviewFact,
} from '../checkout/order-ledger.ts';
import {
  openingStatements,
  type NewOrder,
  type Order,
  type SettlementSource,
} from '../checkout/order-store.ts';
import { isHeldElsewhere, releaseOnceEnded } from '../checkout/purchase-holds.ts';

/**
 * Where a request stands. `sending`: written before PayPal is called, the request is under way.
 * `unconfirmed`: PayPal did not answer whether it created or sent the invoice. `refused`: PayPal
 * answered that it would not, so nothing can be paid. `review`: PayPal reported the invoice paid,
 * but not as the order asked; it opens nothing and is followed up until it is paid in full.
 */
const OPEN_STATES = ['sending', 'sent', 'unconfirmed'] as const;
const statusSchema = z.enum([...OPEN_STATES, 'refused', 'review', 'paid', 'cancelled']);

type SponsorshipState = z.infer<typeof statusSchema>;

/** The states in which the employer may have, or may come to have, an invoice to pay. */
const OPEN = "('sending', 'sent', 'unconfirmed')";
/** The states from which a payment in full may still be recorded. */
const PAYABLE = "('sending', 'sent', 'unconfirmed', 'review')";

/** A PayPal invoice asked of an employer for one order. */
export interface StoredSponsorship {
  readonly id: string;
  readonly orderId: string;
  /** The course of the order, read with it. */
  readonly courseId: string;
  /** Known as soon as PayPal has created the draft, before it is sent. */
  readonly invoiceId: string | undefined;
  readonly invoiceNumber: string;
  readonly payUrl: string | undefined;
  readonly status: SponsorshipState;
  readonly requestedAt: string;
  readonly paidAt: string | undefined;
}

const rowSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  course_id: z.string(),
  invoice_id: z.string().nullable(),
  invoice_number: z.string(),
  pay_url: z.string().nullable(),
  status: statusSchema,
  requested_at: z.string(),
  paid_at: z.string().nullable(),
});

const SELECT_SPONSORSHIPS = `
  SELECT s.id, s.order_id, o.course_id, s.invoice_id, s.invoice_number, s.pay_url, s.status,
         s.requested_at, s.paid_at
    FROM sponsorships s JOIN orders o ON o.id = s.order_id`;

/**
 * Sponsorships and their ledger rows, each change in one transaction. The employer's address is
 * passed on to PayPal and never stored here.
 */
export interface SponsorshipStore {
  /**
   * Opens the order of a request, takes its course and writes the request as `sending`, in one
   * transaction, before PayPal is called. `undefined` when another order holds the course.
   */
  open(order: NewOrder, invoiceNumber: string): Promise<[StoredSponsorship, Order] | undefined>;
  /** PayPal created the draft: its id is kept before the draft is sent. */
  recordDraft(sponsorship: StoredSponsorship, invoiceId: string): Promise<void>;
  /** The invoice went out, and may be paid from now on. */
  recordSent(sponsorship: StoredSponsorship, order: Order, sent: SentInvoice): Promise<void>;
  /** PayPal did not answer: the request stays open until PayPal is asked again. */
  recordUnconfirmed(sponsorship: StoredSponsorship): Promise<void>;
  /** PayPal refused: the order fails, keeping PayPal's code, and the course is free again. */
  recordRefused(sponsorship: StoredSponsorship, order: Order, issue: string): Promise<void>;
  /** Paid in full as the order asked: the order paid, the learner enrolled, the ledger row. */
  recordPaid: RecordFact<PaidFact>;
  /** Paid, but not as the order asked: kept on the order, which holds the course; no access. */
  recordReview: RecordFact<ReviewFact>;
  /** The invoice was cancelled, or withdrawn before it was sent: the order ends unpaid. */
  recordCancelled(sponsorship: StoredSponsorship, order: Order, invoiceId: string): Promise<void>;
  find(sponsorshipId: string): Promise<StoredSponsorship | undefined>;
  findByInvoice(invoiceId: string): Promise<StoredSponsorship | undefined>;
  findByOrder(orderId: string): Promise<StoredSponsorship | undefined>;
  /** The learner's requests, newest first, leaving out those PayPal refused. */
  listByLearner(learnerId: string): Promise<StoredSponsorship[]>;
}

/** Records what PayPal reported paid on the invoice of a request. */
type RecordFact<Fact> = (
  sponsorship: StoredSponsorship,
  order: Order,
  fact: Fact,
  source: SettlementSource,
) => Promise<void>;

/** What Rewire learns of an invoice once it is out. */
interface SentInvoice {
  readonly invoiceId: string;
  readonly payUrl: string | undefined;
}

export function createSponsorshipStore(database: Database, clock: Clock): SponsorshipStore {
  const select = async (condition: string, value: string): Promise<StoredSponsorship[]> => {
    const result = await database.execute(`${SELECT_SPONSORSHIPS} WHERE ${condition}`, [value]);
    return result.rows.map((row) => sponsorshipOf(rowSchema.parse(row)));
  };
  const write = async (statements: (at: string) => Statement[]) => {
    await database.batch(statements(clock().toISOString()), 'write');
  };

  return {
    async open(newOrder, invoiceNumber) {
      const at = clock().toISOString();
      const [order, opening] = openingStatements(newOrder, at);
      const sponsorship = requestedSponsorshipOf(order, invoiceNumber, at);
      try {
        await database.batch([...opening, insertSponsorship(sponsorship)], 'write');
      } catch (error) {
        if (isHeldElsewhere(error)) {
          return undefined;
        }
        throw error;
      }
      return [sponsorship, order];
    },
    recordDraft: ({ id }, invoiceId) =>
      write(() => [
        {
          sql: 'UPDATE sponsorships SET invoice_id = ? WHERE id = ? AND invoice_id IS NULL',
          args: [invoiceId, id],
        },
      ]),
    recordSent: (sponsorship, order, sent) =>
      write((at) => sentStatements(sponsorship, order, sent, at)),
    recordUnconfirmed: ({ id }) =>
      write(() => [
        {
          sql: `UPDATE sponsorships SET status = 'unconfirmed' WHERE id = ? AND status = 'sending'`,
          args: [id],
        },
      ]),
    recordRefused: (sponsorship, order, issue) =>
      write((at) => endedStatements(sponsorship, order, issue, 'refused', at)),
    recordPaid: (sponsorship, order, paid, source) =>
      write((at) => [
        ...paidStatements(order, paid, source, at),
        sponsorshipPaid(sponsorship, order, at),
      ]),
    recordReview: (sponsorship, order, review, source) =>
      write((at) => [...reviewStatements(order, review, source, at), inReview(sponsorship, order)]),
    recordCancelled: (sponsorship, order, invoiceId) =>
      write((at) => endedStatements(sponsorship, order, invoiceId, 'cancelled', at)),
    find: async (sponsorshipId) => (await select('s.id = ?', sponsorshipId))[0],
    findByInvoice: async (invoiceId) => (await select('s.invoice_id = ?', invoiceId))[0],
    findByOrder: async (orderId) => (await select('s.order_id = ?', orderId))[0],
    listByLearner: (learnerId) =>
      select(`o.learner_id = ? AND s.status <> 'refused' ORDER BY s.requested_at DESC`, learnerId),
  };
}

function requestedSponsorshipOf(
  order: Order,
  invoiceNumber: string,
  requestedAt: string,
): StoredSponsorship {
  return {
    id: randomUUID(),
    orderId: order.id,
    courseId: order.courseId,
    invoiceId: undefined,
    invoiceNumber,
    payUrl: undefined,
    status: 'sending',
    requestedAt,
    paidAt: undefined,
  };
}

function insertSponsorship(sponsorship: StoredSponsorship): Statement {
  return {
    sql: `INSERT INTO sponsorships (id, order_id, invoice_number, status, requested_at)
          VALUES (?, ?, ?, 'sending', ?)`,
    args: [sponsorship.id, sponsorship.orderId, sponsorship.invoiceNumber, sponsorship.requestedAt],
  };
}

/**
 * A ledger row of the invoice, written only while its order is still unpaid and open. It moves
 * no money: the payment row does. Its reference is the invoice id, or PayPal's code of a refusal.
 */
function ledgerRow(
  order: Order,
  kind: 'invoice-sent' | 'invoice-cancelled',
  reference: string,
  at: string,
): Statement {
  return {
    sql: `INSERT OR IGNORE INTO payment_events
            (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
          SELECT id, ?, 0, currency, ?, 'checkout', ? FROM orders
           WHERE id = ? AND status = 'created'`,
    args: [kind, reference, at, order.id],
  };
}

function sentStatements(
  sponsorship: StoredSponsorship,
  order: Order,
  { invoiceId, payUrl }: SentInvoice,
  at: string,
): Statement[] {
  return [
    ledgerRow(order, 'invoice-sent', invoiceId, at),
    {
      // Read again, a request already sent only learns the page to pay on.
      sql: `UPDATE sponsorships
               SET status = 'sent', invoice_id = COALESCE(invoice_id, ?),
                   pay_url = COALESCE(?, pay_url)
             WHERE id = ? AND status IN ${OPEN}`,
      args: [invoiceId, payUrl ?? null, sponsorship.id],
    },
  ];
}

/** Ends an open request whose order was never paid, and frees its course. A paid one stays. */
function endedStatements(
  sponsorship: StoredSponsorship,
  order: Order,
  reference: string,
  status: 'refused' | 'cancelled',
  at: string,
): Statement[] {
  return [
    ledgerRow(order, 'invoice-cancelled', reference, at),
    {
      sql: `UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'created'`,
      args: [order.id],
    },
    {
      sql: `UPDATE sponsorships SET status = ?
             WHERE id = ? AND status IN ${OPEN}
               AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'failed')`,
      args: [status, sponsorship.id, order.id],
    },
    releaseOnceEnded(order.id),
  ];
}

/** A request is paid once its order is, from any state its invoice may still be paid in. */
function sponsorshipPaid(sponsorship: StoredSponsorship, order: Order, at: string): Statement {
  return {
    sql: `UPDATE sponsorships SET status = 'paid', paid_at = ?
           WHERE id = ? AND status IN ${PAYABLE}
             AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'completed')`,
    args: [at, sponsorship.id, order.id],
  };
}

/** An open request waits in review once its order holds a payment in review. */
function inReview(sponsorship: StoredSponsorship, order: Order): Statement {
  return {
    sql: `UPDATE sponsorships SET status = 'review'
           WHERE id = ? AND status IN ${OPEN}
             AND EXISTS (SELECT 1 FROM orders
                          WHERE id = ? AND status = 'pending' AND review_reason IS NOT NULL)`,
    args: [sponsorship.id, order.id],
  };
}

function sponsorshipOf(row: z.infer<typeof rowSchema>): StoredSponsorship {
  return {
    id: row.id,
    orderId: row.order_id,
    courseId: row.course_id,
    invoiceId: row.invoice_id ?? undefined,
    invoiceNumber: row.invoice_number,
    payUrl: row.pay_url ?? undefined,
    status: row.status,
    requestedAt: row.requested_at,
    paidAt: row.paid_at ?? undefined,
  };
}
