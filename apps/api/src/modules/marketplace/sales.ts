import { DEMO_SELLER, findSellableCourse } from '@rewire/content';
import {
  marketSaleStatusSchema,
  marketSalesSchema,
  moneySchema,
  paymentMethodSchema,
  type MarketSale,
  type MarketSales,
  type MarketSalesTotal,
} from '@rewire/contracts';
import { z } from 'zod';
import type { Database } from '../../platform/database.ts';

/** One course of one order, as the ledger keeps it: an order without lines is one course. */
const lineRowSchema = z.object({
  order_id: z.string(),
  course_id: z.string(),
  line_minor: z.number().int().positive(),
  method: paymentMethodSchema,
  currency: moneySchema.shape.currency,
  status: marketSaleStatusSchema,
  created_at: z.string(),
  paid_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  paypal_capture_id: z.string().nullable(),
  partly_refunded_minor: z.number().int().nonnegative(),
});
type LineRow = z.infer<typeof lineRowSchema>;

/**
 * Every course of every order that moved money: paid, held by PayPal, or refunded. An order
 * opened and never approved, or that failed, sold nothing; neither does an invoice not yet paid.
 * The partial refunds of an order are summed from its ledger, where they are negative.
 */
const SALE_LINES = `
  SELECT o.id order_id, COALESCE(i.course_id, o.course_id) course_id,
         COALESCE(i.amount_minor, o.amount_minor) line_minor, o.method, o.currency, o.status,
         o.created_at, o.paid_at, o.refunded_at, o.paypal_capture_id,
         -(SELECT COALESCE(SUM(e.amount_minor), 0) FROM payment_events e
            WHERE e.order_id = o.id AND e.kind = 'refund-partial') partly_refunded_minor
    FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
   WHERE o.status IN ('completed', 'pending', 'refunded')
   ORDER BY o.created_at DESC, o.id, i.rowid`;

/**
 * Shares what went back of an order among its courses, in proportion to their prices and in
 * whole minor units, so that the shares add up to exactly what went back.
 */
function sharesOf(amounts: readonly number[], refundedMinor: number): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const shares = amounts.map((amount) => Math.floor((refundedMinor * amount) / total));
  let left = refundedMinor - shares.reduce((sum, share) => sum + share, 0);
  for (let index = 0; left > 0; index = (index + 1) % shares.length) {
    if ((shares[index] ?? 0) < (amounts[index] ?? 0)) {
      shares[index] = (shares[index] ?? 0) + 1;
      left -= 1;
    }
  }
  return shares;
}

function saleOf(row: LineRow, single: boolean, refundedMinor: number): MarketSale {
  const course = findSellableCourse(row.course_id);
  return {
    id: single ? row.order_id : `${row.order_id}:${row.course_id}`,
    orderId: row.order_id,
    courseId: row.course_id,
    title: course?.title ?? row.course_id,
    provider: course?.provider ?? null,
    kind: course?.kind ?? null,
    method: row.method,
    amount: { currency: row.currency, minorUnits: row.line_minor },
    refundedMinor,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    paypalReference: row.paypal_capture_id,
  };
}

/** The sales of one order, one per course; a refunded order gave every course back in full. */
function salesOfOrder(lines: readonly LineRow[]): MarketSale[] {
  const amounts = lines.map((line) => line.line_minor);
  const refunded = lines[0]?.status === 'refunded';
  const shares = refunded
    ? amounts
    : sharesOf(amounts, Math.min(lines[0]?.partly_refunded_minor ?? 0, sumOf(amounts)));
  return lines.map((line, index) => saleOf(line, lines.length === 1, shares[index] ?? 0));
}

const sumOf = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);

/** What the seller keeps, holds and gave back in each currency, from its sales. */
function totalsOf(sales: readonly MarketSale[]): MarketSalesTotal[] {
  const currencies = [...new Set(sales.map((sale) => sale.amount.currency))].toSorted();
  return currencies.map((currency) => {
    const own = sales.filter((sale) => sale.amount.currency === currency);
    const paid = own.filter((sale) => sale.status === 'completed');
    const kept = (sale: MarketSale) => sale.amount.minorUnits - sale.refundedMinor;
    const netMinor = sumOf(paid.map(kept));
    return {
      currency,
      netMinor,
      reviewMinor: sumOf(own.filter((sale) => sale.status === 'pending').map(kept)),
      refundedMinor: sumOf(own.map((sale) => sale.refundedMinor)),
      sold: paid.length,
      refunds: own.filter((sale) => sale.refundedMinor > 0).length,
      averageMinor: paid.length === 0 ? null : Math.round(netMinor / paid.length),
    };
  });
}

/** Every sale of the demonstration seller, newest first, and its totals by currency. */
export async function sales(database: Database): Promise<MarketSales> {
  const result = await database.execute(SALE_LINES);
  const orders = new Map<string, LineRow[]>();
  for (const entry of result.rows) {
    const row = lineRowSchema.parse(entry);
    orders.set(row.order_id, [...(orders.get(row.order_id) ?? []), row]);
  }
  const lines = [...orders.values()].flatMap(salesOfOrder);
  return marketSalesSchema.parse({
    seller: DEMO_SELLER.name,
    sales: lines,
    totals: totalsOf(lines),
  });
}
