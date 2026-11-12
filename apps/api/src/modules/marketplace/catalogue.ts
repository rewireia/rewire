import {
  findSellableCourse,
  REGION_PROFILES,
  SELLABLE_COURSES,
  type SellableCourse,
} from '@rewire/content';
import type { DiscountBeacon, MarketCourse, Region } from '@rewire/contracts';
import { notFound } from '../../http/problem.ts';
import type { Database } from '../../platform/database.ts';
import { activeBeacon, discounted } from '../offers/beacons.ts';

const numberOf = (value: unknown) => Number(value ?? 0);

function termsOf(course: SellableCourse, region: Region, priceMinor: number): MarketCourse {
  return {
    courseId: course.id,
    region,
    title: course.title,
    currency: REGION_PROFILES[region].currency,
    kind: course.kind,
    provider: course.provider,
    languages: [...course.languages],
    hours: course.hours,
    priceMinor,
    published: true,
    offer: null,
  };
}

function defaultTermsFor(region: Region): MarketCourse[] {
  const currency = REGION_PROFILES[region].currency;
  return SELLABLE_COURSES.filter(
    (course) => course.regions.length === 0 || course.regions.includes(region),
  ).map((course) => termsOf(course, region, course.prices[currency]));
}

/** The content's courses sold in each region at their own sandbox price, before any terms. */
const DEFAULT_TERMS: Readonly<Record<Region, readonly MarketCourse[]>> = {
  us: defaultTermsFor('us'),
  uk: defaultTermsFor('uk'),
  eu: defaultTermsFor('eu'),
};

/** The courses the seller published from its dashboard in a region, with their own terms. */
async function ownTerms(database: Database, region: Region): Promise<MarketCourse[]> {
  const result = await database.execute({
    sql: 'SELECT id, price_minor, published FROM seller_courses WHERE region = ? ORDER BY created_at',
    args: [region],
  });
  return result.rows.flatMap((row) => {
    const id = row['id'];
    const course = typeof id === 'string' ? findSellableCourse(id) : undefined;
    if (course === undefined) return [];
    const terms = termsOf(course, region, numberOf(row['price_minor']));
    return [{ ...terms, published: row['published'] === 1 }];
  });
}

/** A course's terms while a beacon runs: everyone pays the discounted price. */
function withOffer(course: MarketCourse, beacon: DiscountBeacon | undefined): MarketCourse {
  if (beacon === undefined || !course.published) return course;
  return {
    ...course,
    priceMinor: discounted(course.priceMinor, beacon.percent),
    offer: {
      percent: beacon.percent,
      listPrice: { currency: course.currency, minorUnits: course.priceMinor },
      endsAt: beacon.endsAt,
    },
  };
}

/**
 * Every course sold in a region at an instant (by default, now), at the price everyone pays then:
 * the terms the seller set, less the discount of the beacon running then. The one place a price
 * is decided.
 */
export async function catalogue(
  database: Database,
  region: Region,
  now = new Date(),
): Promise<MarketCourse[]> {
  const [result, own, beacon] = await Promise.all([
    database.execute({
      sql: 'SELECT course_id, price_minor, published FROM market_terms WHERE region = ?',
      args: [region],
    }),
    ownTerms(database, region),
    activeBeacon(database, region, now),
  ]);
  const terms = new Map(result.rows.map((row) => [row['course_id'], row]));
  const content = DEFAULT_TERMS[region].map((course) => {
    const row = terms.get(course.courseId);
    return row
      ? { ...course, priceMinor: numberOf(row['price_minor']), published: row['published'] === 1 }
      : course;
  });
  return [...content, ...own].map((course) => withOffer(course, beacon));
}

/**
 * Keeps the one sandbox price the seller set for a content course of the region, and whether it
 * is on sale. The table's former minimum column, kept by its migration, takes the price.
 */
export async function setTerms(database: Database, terms: MarketCourse): Promise<MarketCourse> {
  if (!findSellableCourse(terms.courseId)) throw notFound('That course');
  await database.execute({
    sql: `INSERT INTO market_terms (course_id, region, price_minor, minimum_minor, published)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(course_id, region) DO UPDATE SET price_minor = excluded.price_minor,
        minimum_minor = excluded.minimum_minor, published = excluded.published`,
    args: [
      terms.courseId,
      terms.region,
      terms.priceMinor,
      terms.priceMinor,
      terms.published ? 1 : 0,
    ],
  });
  return { ...terms, offer: null };
}
