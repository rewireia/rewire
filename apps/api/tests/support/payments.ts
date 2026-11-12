import type { PaidFact } from '../../src/modules/checkout/order-ledger.ts';
import type { Order } from '../../src/modules/checkout/order-store.ts';

/** A payment of exactly what the order asked for, as PayPal would report it late or again. */
export function paidAs(order: Order, reference: string): PaidFact {
  return { reference, amount: order.amount, refunds: [] };
}
