import type { Currency, Money, Payment } from '@rewire/contracts';

/** What was paid and what went back, in one currency. Currencies are never added together. */
export interface CurrencyTotal {
  readonly currency: Currency;
  /** Every payment that was received, refunded or not. */
  readonly paid: Money;
  readonly refunded: Money;
}

/** The totals of a payment history, one per currency, in the order the currencies first appear. */
export function paymentTotals(payments: readonly Payment[]): readonly CurrencyTotal[] {
  const totals = new Map<Currency, { paid: number; refunded: number }>();
  for (const { amount, paidAt, status } of payments) {
    const total = totals.get(amount.currency) ?? { paid: 0, refunded: 0 };
    if (paidAt !== null) {
      total.paid += amount.minorUnits;
    }
    if (status === 'refunded') {
      total.refunded += amount.minorUnits;
    }
    totals.set(amount.currency, total);
  }
  return [...totals].map(([currency, { paid, refunded }]) => ({
    currency,
    paid: { currency, minorUnits: paid },
    refunded: { currency, minorUnits: refunded },
  }));
}

/**
 * Orders amounts by currency and then by amount, so a sorted column never ranks cents of one
 * currency against cents of another. A missing amount goes first, as AG Grid does with blanks.
 */
export function compareMoney(left: Money | null, right: Money | null): number {
  if (left === null || right === null) {
    return (left === null ? 0 : 1) - (right === null ? 0 : 1);
  }
  return left.currency.localeCompare(right.currency) || left.minorUnits - right.minorUnits;
}
