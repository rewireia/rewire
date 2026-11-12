import type { Currency } from './schema/money.ts';

/**
 * Bands of the sandbox price of a listed course, by the hours its provider states. The
 * price is a demonstration figure of this marketplace, not what the provider charges: the
 * same number of minor units in every currency, never converted.
 */
const PRICE_BANDS: readonly { readonly upToHours: number; readonly minorUnits: number }[] = [
  { upToHours: 2, minorUnits: 900 },
  { upToHours: 8, minorUnits: 1900 },
  { upToHours: 24, minorUnits: 2900 },
  { upToHours: Infinity, minorUnits: 3900 },
];

/** The band for a course whose provider states no duration. */
const UNKNOWN_HOURS_MINOR_UNITS = 1900;

/** The sandbox price of a listed course in each currency, from its stated hours. */
export function listedPrices(hours: number | null): Readonly<Record<Currency, number>> {
  const minorUnits =
    hours === null
      ? UNKNOWN_HOURS_MINOR_UNITS
      : (PRICE_BANDS.find((band) => hours <= band.upToHours)?.minorUnits ??
        UNKNOWN_HOURS_MINOR_UNITS);
  return { USD: minorUnits, GBP: minorUnits, EUR: minorUnits };
}
