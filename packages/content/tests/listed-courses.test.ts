import { describe, expect, it } from 'vitest';

import { HOSTED_COURSE_TOPICS } from '../src/courses/hosted-topics.ts';
import {
  COURSE_TOPIC_IDS,
  COURSE_TOPIC_LABELS,
  CURATED_COURSES,
  DEMO_COURSES,
  FREE_COURSES,
  LISTED_COURSES,
  LISTED_SOURCES,
  SELLABLE_COURSES,
  catalogueSnapshotSchema,
  courseLevelSchema,
  curatedCourseSchema,
  findSellableCourse,
  listedCourseSchema,
  listedPrices,
} from '../src/index.ts';

const microsoftLearn = LISTED_COURSES.filter((course) => course.provider === 'Microsoft Learn');
const sepe = LISTED_COURSES.filter((course) => course.id.startsWith('sepe-'));

function sourceOf(provider: string) {
  const source = LISTED_SOURCES.find((entry) => entry.provider === provider);
  if (source === undefined) throw new Error(`no source for ${provider}`);
  return source;
}

describe('the listed courses', () => {
  it('match their schema', () => {
    for (const course of LISTED_COURSES) {
      expect(listedCourseSchema.safeParse(course).error).toBeUndefined();
    }
    for (const course of CURATED_COURSES) {
      expect(curatedCourseSchema.safeParse(course).error).toBeUndefined();
    }
  });

  it('never share an id, with each other or with a hosted course', () => {
    const ids = SELLABLE_COURSES.map((course) => course.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SELLABLE_COURSES).toHaveLength(DEMO_COURSES.length + LISTED_COURSES.length);
  });

  it('hold the public catalogue of Microsoft Learn, with its source and the day it was read', () => {
    const source = sourceOf('Microsoft Learn');
    expect(microsoftLearn.length).toBeGreaterThan(900);
    expect(source.source).toMatch(/^https:\/\/learn\.microsoft\.com\/api\/catalog\//);
    for (const course of microsoftLearn) {
      expect(course.url).toMatch(/^https:\/\/learn\.microsoft\.com\/en-us\/training\//);
      expect(course.url).not.toContain('WT.mc_id');
      expect(course.summary).not.toMatch(/<|&[a-z]+;/);
      expect(course.providerAccess).toBe('free');
      expect(course.checkedOn).toBe(source.capturedOn);
      expect(course.regions).toEqual([]);
    }
  });

  it('hold the online specialties of the SEPE catalogue, for the EU and in Spanish only', () => {
    const source = sourceOf('SEPE · Catálogo de Especialidades Formativas');
    expect(source.citation).toBe(
      'Origen de los datos: SEPE, Catálogo de Especialidades Formativas (exportado el 27/09/2026).',
    );
    expect(source.capturedOn).toBe('2026-09-27');
    expect(sepe.length).toBeGreaterThan(1000);
    for (const course of sepe) {
      expect(course.url).toMatch(/^https:\/\/sede\.sepe\.gob\.es\//);
      expect(course).toMatchObject({
        regions: ['eu'],
        languages: ['es'],
        providerAccess: 'unknown',
      });
      expect(course.hours).toBeGreaterThan(0);
      expect(course.summaryEs).toMatch(/^Especialidad formativa oficial de la familia /);
      expect(course.title).not.toBe(course.title.toUpperCase());
    }
  });

  it('keep the snapshot files in their schema', async () => {
    for (const file of [
      await import('../src/courses/listed/microsoft-learn.json', { with: { type: 'json' } }),
      await import('../src/courses/listed/sepe.json', { with: { type: 'json' } }),
    ]) {
      expect(catalogueSnapshotSchema.safeParse(file.default).error).toBeUndefined();
    }
  });

  it('list the real free courses of the plan among the curated ones, each in two languages', () => {
    const curated = new Map(CURATED_COURSES.map((course) => [course.id, course]));
    for (const free of FREE_COURSES) {
      expect(curated.get(free.id)).toMatchObject({
        title: free.title,
        provider: free.provider,
        url: free.url,
        hours: free.hours,
        providerAccess: 'free',
      });
    }
    expect(CURATED_COURSES.length).toBeGreaterThan(90);
    for (const course of CURATED_COURSES) {
      expect(course.summaryEs).not.toBe(course.summary);
      expect(course.provider).not.toBe('Microsoft Learn');
    }
  });
});

describe('the topics of the catalogue', () => {
  it('are few, stable and named in English and Spanish', () => {
    expect(COURSE_TOPIC_IDS.length).toBeGreaterThanOrEqual(10);
    expect(COURSE_TOPIC_IDS.length).toBeLessThanOrEqual(16);
    for (const id of COURSE_TOPIC_IDS) {
      expect(COURSE_TOPIC_LABELS[id].en).not.toBe('');
      expect(COURSE_TOPIC_LABELS[id].es).not.toBe(COURSE_TOPIC_LABELS[id].en);
    }
  });

  it('are given to every hosted course', () => {
    expect(Object.keys(HOSTED_COURSE_TOPICS).toSorted()).toEqual(
      DEMO_COURSES.map((course) => course.id).toSorted(),
    );
    for (const course of SELLABLE_COURSES) {
      expect(course.topics.length).toBeGreaterThan(0);
    }
  });
});

describe('the sandbox price of a listed course', () => {
  it('follows the bands of its stated hours, with the same number in every currency', () => {
    expect(listedPrices(1.5)).toEqual({ USD: 900, GBP: 900, EUR: 900 });
    expect(listedPrices(2)).toEqual({ USD: 900, GBP: 900, EUR: 900 });
    expect(listedPrices(2.1)).toEqual({ USD: 1900, GBP: 1900, EUR: 1900 });
    expect(listedPrices(24)).toEqual({ USD: 2900, GBP: 2900, EUR: 2900 });
    expect(listedPrices(72)).toEqual({ USD: 3900, GBP: 3900, EUR: 3900 });
    expect(listedPrices(null)).toEqual({ USD: 1900, GBP: 1900, EUR: 1900 });
  });
});

describe('findSellableCourse', () => {
  it('finds a hosted course with its own prices', () => {
    const hosted = DEMO_COURSES[0];
    expect(hosted).toBeDefined();
    expect(findSellableCourse(hosted?.id ?? '')).toMatchObject({
      kind: 'hosted',
      title: hosted?.title,
      prices: hosted?.prices,
      url: null,
    });
  });

  it('finds a listed course at its band price, and nothing for an unknown id', () => {
    const listed = microsoftLearn[0];
    expect(listed).toBeDefined();
    const found = findSellableCourse(listed?.id ?? '');
    expect(found).toMatchObject({ kind: 'listed', title: listed?.title, url: listed?.url });
    expect(found?.prices).toEqual(listedPrices(listed?.hours ?? null));
    expect(courseLevelSchema.options).toContain(found?.level);
    expect(findSellableCourse('no-such-course')).toBeUndefined();
  });
});
