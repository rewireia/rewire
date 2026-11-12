import type { Currency, Money } from '@rewire/contracts';

import { BRAND_NAME } from '../app/brand.ts';
import type { Language } from '../app/preferences.ts';

import { en, type Catalogue, type MessageKey } from './en.ts';
import { es } from './es.ts';

const CATALOGUES: Readonly<Record<Language, Catalogue>> = { en, es };

/** Digits after the decimal point of each currency Rewire sells in. */
const MINOR_DIGITS: Readonly<Record<Currency, number>> = { USD: 2, GBP: 2, EUR: 2 };

export type MessageValues = Readonly<Record<string, string | number>>;

/** Turns a score from 0 to 1 into points from 0 to 100. */
export function toPoints(score: number): number {
  return Math.round(score * 100);
}

/** Fills the `{name}` placeholders of a message; numbers are written in the language. */
export function interpolate(template: string, values: MessageValues, language: Language): string {
  const numbers = new Intl.NumberFormat(language);
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    if (value === undefined) {
      return placeholder;
    }
    return typeof value === 'number' ? numbers.format(value) : value;
  });
}

/** A message in the language; `{brand}` is the name of the product unless given. */
export function translate(language: Language, key: MessageKey, values: MessageValues = {}): string {
  return interpolate(CATALOGUES[language][key], { brand: BRAND_NAME, ...values }, language);
}

/** A score as the integer from 0 to 100 the interface shows. */
export function formatPoints(score: number, language: Language): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(toPoints(score));
}

/** A date written as `YYYY-MM-DD`, in the long form of the language. */
export function formatDate(isoDate: string, language: Language): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** An amount of money from its minor units (cents or pence), in the currency's own format. */
export function formatMoney(money: Money, language: Language): string {
  const digits = MINOR_DIGITS[money.currency];
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: money.minorUnits % 10 ** digits === 0 ? 0 : digits,
  }).format(money.minorUnits / 10 ** digits);
}

/** A whole amount, such as a published salary, without decimals. */
export function formatWholeAmount(value: number, currency: Currency, language: Language): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** The day of an ISO date and time, in the short form of the language. */
export function formatDay(isoDateTime: string, language: Language): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return isoDateTime;
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

/** Items joined as the language lists them: "a, b and c". */
export function formatList(items: readonly string[], language: Language): string {
  return new Intl.ListFormat(language, { style: 'long', type: 'conjunction' }).format(items);
}
