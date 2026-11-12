import { TOP_UP_MAXIMUM_MINOR, TOP_UP_MINIMUM_MINOR } from '@rewire/contracts';

/** The amounts offered at a touch, in minor units. */
export const TOP_UP_CHOICES = [2500, 5000, 10_000, 25_000] as const;

/**
 * The amount the person typed, in minor units, or `null` when it is not an amount the wallet
 * takes: from 5.00 to 500.00, with at most two decimals.
 */
export function topUpAmountOf(typed: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(typed.trim());
  if (match === null) return null;
  const [, units = '0', cents = ''] = match;
  const minor = Number(units) * 100 + Number(cents.padEnd(2, '0'));
  return minor >= TOP_UP_MINIMUM_MINOR && minor <= TOP_UP_MAXIMUM_MINOR ? minor : null;
}
