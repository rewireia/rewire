import type { CatalogueCourse } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { guardStorage } from '../src/app/storage.ts';
import { filterCourses, isFiltered, NO_FILTER } from '../src/features/courses/course-filter.ts';
import {
  createDismissals,
  DISMISSED_KEY,
  parseDismissed,
} from '../src/features/offers/offer-dismissal.ts';
import {
  beaconKey,
  isRunning,
  nextEnd,
  offerEnds,
  offerUntil,
  priceAt,
  totalsAt,
} from '../src/features/offers/offer-terms.ts';

const ENDS = '2026-11-12T19:00:00.000Z';
const BEFORE = Date.parse('2026-11-12T10:00:00.000Z');
const AFTER = Date.parse('2026-11-12T19:00:01.000Z');
const MADRID = 'Europe/Madrid';

function course(id: string, change: Partial<CatalogueCourse> = {}): CatalogueCourse {
  return {
    id,
    kind: 'hosted',
    title: `Course ${id}`,
    provider: 'Provider A',
    url: null,
    summary: 'A course for testing.',
    topics: [],
    level: 'introductory',
    hours: 2,
    languages: ['en'],
    providerAccess: 'paid',
    price: { currency: 'EUR', minorUnits: 2000 },
    checkedOn: '2026-11-10',
    enrolment: 'none',
    ...change,
  };
}

/** A course a 25 % beacon takes from 50 € to 37,50 €. */
const OFFER = {
  percent: 25,
  listPrice: { currency: 'EUR', minorUnits: 5000 },
  endsAt: ENDS,
} as const;
const OFFERED = course('offered', { price: { currency: 'EUR', minorUnits: 3750 }, offer: OFFER });
const PLAIN = course('plain');
const NO_OFFER = course('none', { offer: null });

describe('the price of a course on offer', () => {
  it('is the server’s price while the offer runs, with its offer', () => {
    expect(priceAt(OFFERED, BEFORE)).toEqual({ price: OFFERED.price, offer: OFFERED.offer });
  });

  it('is the list price once the offer is over, without waiting for the server', () => {
    expect(isRunning(ENDS, AFTER)).toBe(false);
    expect(priceAt(OFFERED, AFTER)).toEqual({
      price: { currency: 'EUR', minorUnits: 5000 },
      offer: null,
    });
  });

  it('is the plain price of a course with no offer', () => {
    expect(priceAt(PLAIN, BEFORE)).toEqual({ price: PLAIN.price, offer: null });
    expect(priceAt(NO_OFFER, BEFORE)).toEqual({ price: NO_OFFER.price, offer: null });
  });
});

describe('totalsAt', () => {
  it('adds the prices paid now and what the offer takes off', () => {
    expect(totalsAt([OFFERED, PLAIN], BEFORE)).toEqual({
      total: { currency: 'EUR', minorUnits: 5750 },
      saving: { currency: 'EUR', minorUnits: 1250 },
    });
  });

  it('saves nothing without a running offer, and counts list prices after its end', () => {
    expect(totalsAt([PLAIN, NO_OFFER], BEFORE)).toEqual({
      total: { currency: 'EUR', minorUnits: 4000 },
      saving: null,
    });
    expect(totalsAt([OFFERED, PLAIN], AFTER)).toEqual({
      total: { currency: 'EUR', minorUnits: 7000 },
      saving: null,
    });
  });

  it('has no total for no courses', () => {
    expect(totalsAt([], BEFORE)).toEqual({ total: null, saving: null });
  });
});

describe('the end of an offer', () => {
  it('is told by its time alone when it ends today', () => {
    expect(offerUntil(ENDS, BEFORE, 'es', MADRID)).toBe('hasta las 20:00');
    expect(offerUntil(ENDS, BEFORE, 'en', MADRID)).toMatch(/^until 8:00\sPM$/u);
  });

  it('is told with its day when it ends another day', () => {
    const later = '2026-11-14T19:00:00.000Z';
    expect(offerUntil(later, BEFORE, 'es', MADRID)).toBe('hasta el 14 de noviembre a las 20:00');
    expect(offerUntil(later, BEFORE, 'en', MADRID)).toMatch(/^until November 14 at 8:00\sPM$/u);
  });

  it('takes the day in the time zone it is read in', () => {
    const afterMidnightInMadrid = '2026-11-12T23:30:00.000Z';
    expect(offerUntil(afterMidnightInMadrid, BEFORE, 'es', 'UTC')).toBe('hasta las 23:30');
    expect(offerUntil(afterMidnightInMadrid, BEFORE, 'es', MADRID)).toBe(
      'hasta el 13 de noviembre a las 0:30',
    );
  });

  it('is the earliest end still to come, so the page knows when to look again', () => {
    const ends = offerEnds([
      OFFERED,
      PLAIN,
      course('later', { offer: { ...OFFER, endsAt: '2026-11-13T19:00:00.000Z' } }),
    ]);
    expect(ends).toEqual([ENDS, '2026-11-13T19:00:00.000Z']);
    expect(nextEnd(ends, BEFORE)).toBe(ENDS);
    expect(nextEnd(ends, AFTER)).toBe('2026-11-13T19:00:00.000Z');
    expect(nextEnd(ends, Date.parse('2026-11-14T00:00:00.000Z'))).toBeNull();
  });
});

describe('the "On offer" filter', () => {
  const courses = [OFFERED, PLAIN, NO_OFFER];

  it('keeps only the courses a running offer takes money off', () => {
    const found = filterCourses(courses, [], { ...NO_FILTER, onOffer: true });
    expect(found.map(({ id }) => id)).toEqual(['offered']);
    expect(filterCourses(courses, [], NO_FILTER)).toHaveLength(3);
  });

  it('counts as a filter the person can clear', () => {
    expect(isFiltered({ ...NO_FILTER, onOffer: true })).toBe(true);
  });
});

function memoryStorage(refuse = false) {
  const values = new Map<string, string>();
  const denied = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return {
    values,
    storage: guardStorage({
      getItem: (key) => (refuse ? denied() : (values.get(key) ?? null)),
      setItem: (key, value) => {
        if (refuse) denied();
        values.set(key, value);
      },
      removeItem: (key) => {
        if (refuse) denied();
        values.delete(key);
      },
    }),
  };
}

describe('"Not now" on the dashboard notice', () => {
  const beacon = { region: 'eu' as const, percent: 25, endsAt: ENDS };
  const key = beaconKey(beacon);

  it('puts aside that beacon only, and remembers it on the next visit', () => {
    const { storage, values } = memoryStorage();
    const first = createDismissals(storage);
    first.add(key);
    expect(first.has(key)).toBe(true);
    expect(first.has(beaconKey({ ...beacon, percent: 30 }))).toBe(false);
    expect(first.has(beaconKey({ ...beacon, endsAt: '2026-11-13T19:00:00.000Z' }))).toBe(false);
    expect(first.has(beaconKey({ ...beacon, region: 'us' }))).toBe(false);
    expect(JSON.parse(values.get(DISMISSED_KEY) ?? '[]')).toEqual([key]);
    expect(createDismissals(storage).has(key)).toBe(true);
  });

  it('works for the visit when the storage is refused', () => {
    const { storage } = memoryStorage(true);
    const dismissals = createDismissals(storage);
    dismissals.add(key);
    expect(dismissals.has(key)).toBe(true);
    expect(createDismissals(null).has(key)).toBe(false);
  });

  it('reads nothing from a stored value that is not a list of beacons', () => {
    expect(parseDismissed('not json')).toEqual([]);
    expect(parseDismissed('{"a":1}')).toEqual([]);
    expect(parseDismissed(null)).toEqual([]);
  });
});
