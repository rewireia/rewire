import { randomBytes } from 'node:crypto';

import {
  COURSE_TOPIC_IDS,
  DEMO_SELLER,
  REGION_PROFILES,
  setSellerCourses,
  stageOfLevel,
  type SellableCourse,
  type TopicId,
} from '@rewire/content';
import {
  sellerCourseSchema,
  type Region,
  type SellerCourse,
  type SellerCourseInput,
} from '@rewire/contracts';
import { z } from 'zod';

import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';

const rowSchema = z.object({
  id: z.string(),
  region: z.enum(['eu', 'us', 'uk']),
  title: z.string(),
  summary: z.string(),
  level: z.enum(['introductory', 'intermediate', 'advanced']),
  hours: z.number(),
  language: z.enum(['en', 'es']),
  topics: z.string(),
  access_url: z.string(),
  price_minor: z.number().int(),
  published: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
type Row = z.infer<typeof rowSchema>;

const TOPICS: ReadonlySet<string> = new Set(COURSE_TOPIC_IDS);

/** Text the seller typed, as plain text: no markup, single spaces. */
const plain = (text: string) =>
  text
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

const invalid = (title: string) => new HttpProblem({ status: 400, code: 'invalid_input', title });

/** An id that says whose the course is and what it is called, unique with a short suffix. */
function newId(title: string): string {
  const slug = title
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 48)
    .replace(/-$/, '');
  return `sun-${slug || 'course'}-${randomBytes(3).toString('hex')}`;
}

function courseOf(row: Row): SellerCourse {
  return sellerCourseSchema.parse({
    id: row.id,
    region: row.region,
    title: row.title,
    summary: row.summary,
    level: row.level,
    hours: row.hours,
    language: row.language,
    topics: JSON.parse(row.topics) as unknown,
    accessUrl: row.access_url,
    price: { currency: REGION_PROFILES[row.region].currency, minorUnits: row.price_minor },
    published: row.published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/** A course of the seller as the rest of the marketplace sells it; its address is not in it. */
function sellableOf(course: SellerCourse): SellableCourse {
  const minorUnits = course.price.minorUnits;
  return {
    id: course.id,
    title: course.title,
    kind: 'listed',
    provider: DEMO_SELLER.name,
    url: null,
    summary: course.summary,
    summaryEs: null,
    topics: course.topics.filter((topic): topic is TopicId => TOPICS.has(topic)),
    level: course.level,
    stage: stageOfLevel(course.level),
    hours: course.hours,
    languages: [course.language],
    providerAccess: 'paid',
    regions: [course.region],
    checkedOn: course.updatedAt.slice(0, 10),
    prices: { USD: minorUnits, GBP: minorUnits, EUR: minorUnits },
  };
}

function checkedInput(input: SellerCourseInput): SellerCourseInput {
  const title = plain(input.title);
  const summary = plain(input.summary);
  if (title.length < 8 || summary.length < 40) throw invalid('Title or description too short');
  if (input.topics.some((topic) => !TOPICS.has(topic))) throw invalid('Unknown subject');
  return { ...input, title, summary, topics: [...new Set(input.topics)] };
}

/** What the seller wrote of a course, in the order of the table's columns. */
function columnsOf(course: SellerCourseInput) {
  return [
    course.title,
    course.summary,
    course.level,
    course.hours,
    course.language,
    JSON.stringify(course.topics),
    course.accessUrl,
    course.priceMinor,
    course.published ? 1 : 0,
  ];
}

/**
 * The courses the seller publishes from its dashboard: kept in the database, and set in the
 * marketplace's catalogue when the server starts and after each change.
 */
export function createSellerCourses(database: Database, clock: Clock) {
  let byId = new Map<string, SellerCourse>();

  async function load(): Promise<void> {
    const result = await database.execute('SELECT * FROM seller_courses ORDER BY created_at');
    const courses = result.rows.map((row) => courseOf(rowSchema.parse(row)));
    byId = new Map(courses.map((course) => [course.id, course]));
    setSellerCourses(courses.map(sellableOf));
  }

  async function create(input: SellerCourseInput): Promise<SellerCourse> {
    const course = checkedInput(input);
    const id = newId(course.title);
    const now = clock().toISOString();
    await database.execute({
      sql: `INSERT INTO seller_courses (title, summary, level, hours, language, topics, access_url,
              price_minor, published, id, region, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [...columnsOf(course), id, course.region, now, now],
    });
    await load();
    return found(id);
  }

  /** Changes a course; its region stays the one it was published in. */
  async function update(id: string, input: SellerCourseInput): Promise<SellerCourse> {
    const known = found(id);
    const course = checkedInput({ ...input, region: known.region });
    await database.execute({
      sql: `UPDATE seller_courses SET title = ?, summary = ?, level = ?, hours = ?, language = ?,
              topics = ?, access_url = ?, price_minor = ?, published = ?, updated_at = ?
            WHERE id = ?`,
      args: [...columnsOf(course), clock().toISOString(), id],
    });
    await load();
    return found(id);
  }

  /** The price and the sale of a course, as the catalogue's terms change them. */
  async function setTerms(id: string, priceMinor: number, published: boolean) {
    const known = found(id);
    return update(id, {
      ...known,
      language: known.language === 'es' ? 'es' : 'en',
      priceMinor,
      published,
    });
  }

  function found(id: string): SellerCourse {
    const course = byId.get(id);
    if (course === undefined) throw notFound('A course of the seller with that id');
    return course;
  }

  return {
    load,
    create,
    update,
    setTerms,
    list: (region: Region) => [...byId.values()].filter((course) => course.region === region),
    has: (id: string) => byId.has(id),
    /** Where a seller's course is taken; only for a learner enrolled in it. */
    accessUrl: (id: string) => byId.get(id)?.accessUrl,
  };
}

export type SellerCourses = ReturnType<typeof createSellerCourses>;
