import type { ActiveOffer, CatalogueCourse, CatalogueOffer, Money } from '@rewire/contracts';

import type { Language } from '../../app/preferences.ts';
import { translate } from '../../i18n/format.ts';

type Offer = NonNullable<ActiveOffer['offer']>;

/** Whether an offer still runs at an instant, in milliseconds since the epoch. */
export function isRunning(endsAt: string, now: number): boolean {
  return Date.parse(endsAt) > now;
}

/** The ends of the offers on some courses. */
export function offerEnds(courses: readonly Pick<CatalogueCourse, 'offer'>[]): readonly string[] {
  return courses.flatMap((course) => (course.offer ? [course.offer.endsAt] : []));
}

/** The earliest of some ends still to come, or `null` when every one has passed. */
export function nextEnd(ends: readonly string[], now: number): string | null {
  const coming = ends.filter((endsAt) => isRunning(endsAt, now));
  return coming.reduce<string | null>(
    (first, endsAt) => (first === null || Date.parse(endsAt) < Date.parse(first) ? endsAt : first),
    null,
  );
}

/**
 * One beacon, told apart from any other of the region: the same discount and end. A learner who
 * puts its notice aside sees the notice again only for another beacon.
 */
export function beaconKey(offer: Pick<Offer, 'region' | 'percent' | 'endsAt'>): string {
  return `${offer.region}|${String(offer.percent)}|${offer.endsAt}`;
}

/** What a course costs at an instant, and its discount. */
export interface PriceNow {
  readonly price: Money;
  readonly offer: CatalogueOffer | null;
}

/**
 * The server's price while its offer runs; once the offer is over, the list price the server
 * gave with it, which is what it charges from then on.
 */
export function priceAt(course: Pick<CatalogueCourse, 'price' | 'offer'>, now: number): PriceNow {
  const offer = course.offer ?? null;
  if (offer === null) {
    return { price: course.price, offer: null };
  }
  return isRunning(offer.endsAt, now)
    ? { price: course.price, offer }
    : { price: offer.listPrice, offer: null };
}

/** The sum of some amounts of one currency, or `null` for none. */
function sum(amounts: readonly Money[]): Money | null {
  const [first] = amounts;
  if (first === undefined) {
    return null;
  }
  const minorUnits = amounts.reduce((total, amount) => total + amount.minorUnits, 0);
  return { currency: first.currency, minorUnits };
}

/** The total of some courses at an instant, and what the running offers take off it. */
export interface Totals {
  readonly total: Money | null;
  /** `null` when no offer runs on any of them. */
  readonly saving: Money | null;
}

export function totalsAt(
  courses: readonly Pick<CatalogueCourse, 'price' | 'offer'>[],
  now: number,
): Totals {
  const prices = courses.map((course) => priceAt(course, now));
  const savings = prices.flatMap(({ price, offer }) =>
    offer === null ? [] : [{ ...price, minorUnits: offer.listPrice.minorUnits - price.minorUnits }],
  );
  const saving = sum(savings);
  return {
    total: sum(prices.map(({ price }) => price)),
    saving: saving === null || saving.minorUnits <= 0 ? null : saving,
  };
}

/** The day of an instant in a time zone, to tell whether two instants fall on the same day. */
function dayOf(instant: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(instant);
}

/**
 * "until 20:00" when the offer ends today, "until 14 November at 20:00" when it ends another
 * day, in the browser's own time zone unless one is given.
 */
export function offerUntil(
  endsAt: string,
  now: number,
  language: Language,
  timeZone?: string,
): string {
  const end = Date.parse(endsAt);
  const zone = timeZone === undefined ? {} : { timeZone };
  const time = new Intl.DateTimeFormat(language, { timeStyle: 'short', ...zone }).format(end);
  if (dayOf(end, timeZone) === dayOf(now, timeZone)) {
    return translate(language, 'offers.until.today', { time });
  }
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', ...zone }).format(
    end,
  );
  return translate(language, 'offers.until.day', { date, time });
}

/** The parameter of `/courses` that opens the catalogue on the courses on offer. */
export const OFFER_PARAM = 'offer';

/** Where the catalogue lists its courses, under Rex: the offers lead there. */
export const BROWSE_ANCHOR = 'courses-browse';

/** The catalogue with only the courses on offer, scrolled to them. */
export const OFFERS_PATH = `/courses?${OFFER_PARAM}=1#${BROWSE_ANCHOR}`;
