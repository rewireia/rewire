import { z } from 'zod';

/** The currencies Rewire sells in: one per region. */
export const currencySchema = z.enum(['USD', 'GBP', 'EUR']);

export type Currency = z.infer<typeof currencySchema>;

/**
 * An amount of money in the smallest unit of its currency (cents, pence), so that sums
 * and comparisons are exact.
 */
export const moneySchema = z.object({
  currency: currencySchema,
  minorUnits: z.number().int().nonnegative(),
});

export type Money = z.infer<typeof moneySchema>;
