import type { Money, OrderStatus } from '@rewire/contracts';

import type { Statement } from '../../platform/database.ts';

import type { Order, SettlementSource } from './order-store.ts';

/** A condition on the order, with its arguments. */
export interface Condition {
  readonly sql: string;
  readonly args: readonly (string | number)[];
}

const ALWAYS: Condition = { sql: '1 = 1', args: [] };

/** How a fact moves money, read from the order as the database holds it. */
const AMOUNTS = {
  none: '0',
  captured: 'COALESCE(captured_minor, amount_minor)',
} as const;

/** The currency of a ledger row: the one PayPal captured in, when it is known. */
export const CURRENCY = 'COALESCE(captured_currency, currency)';

/**
 * The ledger row of a fact, written only while the order is in a state the fact may change and
 * meets `also`. An amount is either what PayPal reported, or read from the order in the database,
 * never from an earlier reading of it.
 */
export function ledgerRow(
  order: Order,
  fact: {
    readonly kind: string;
    readonly amount: keyof typeof AMOUNTS | Money;
    readonly reference: string;
  },
  from: readonly OrderStatus[],
  source: SettlementSource,
  at: string,
  also: Condition = ALWAYS,
): Statement {
  const [amount, currency, money] =
    typeof fact.amount === 'string'
      ? [AMOUNTS[fact.amount], CURRENCY, []]
      : ['?', '?', [fact.amount.minorUnits, fact.amount.currency]];
  return {
    sql: `INSERT OR IGNORE INTO payment_events
            (order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
          SELECT id, ?, ${amount}, ${currency}, ?, ?, ? FROM orders
           WHERE id = ? AND status IN (${from.map(() => '?').join(', ')}) AND ${also.sql}`,
    args: [fact.kind, ...money, fact.reference, source, at, order.id, ...from, ...also.args],
  };
}

/** A capture that does not match its order is never paid, whatever PayPal reports later. */
export const MATCHED = 'capture_mismatch = 0';
