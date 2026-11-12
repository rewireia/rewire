import type { Currency, Money } from '@rewire/contracts';

/** Every currency Rewire sells in has two decimal places. */
const MINOR_UNITS_PER_UNIT = 100;

/** Writes an amount the way PayPal expects it: `4900` cents become `"49.00"`. */
export function toDecimalAmount(money: Money): string {
  const units = Math.trunc(money.minorUnits / MINOR_UNITS_PER_UNIT);
  const cents = money.minorUnits % MINOR_UNITS_PER_UNIT;
  return `${units}.${String(cents).padStart(2, '0')}`;
}

/**
 * Reads an amount as PayPal writes it, without going through floating point.
 * Returns `undefined` when the text is not a plain amount with at most two decimals.
 */
export function fromDecimalAmount(value: string, currency: Currency): Money | undefined {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (match === null) {
    return undefined;
  }
  const [, units = '0', decimals = ''] = match;
  return {
    currency,
    minorUnits: Number(units) * MINOR_UNITS_PER_UNIT + Number(decimals.padEnd(2, '0')),
  };
}

export function sameMoney(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minorUnits === b.minorUnits;
}
