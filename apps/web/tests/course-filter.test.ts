import type { CatalogueCourse, CourseTopic } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import {
  catalogueLanguages,
  durationOf,
  filterCourses,
  fold,
  isFiltered,
  NO_FILTER,
} from '../src/features/courses/course-filter.ts';

const TOPICS: readonly CourseTopic[] = [
  { id: 'data', label: 'Datos y hojas de cálculo' },
  { id: 'design', label: 'Diseño' },
];

function course(id: string, change: Partial<CatalogueCourse> = {}): CatalogueCourse {
  return {
    id,
    kind: 'listed',
    title: `Course ${id}`,
    provider: 'Provider A',
    url: `https://courses.example.org/${id}`,
    summary: 'A course for testing.',
    topics: [],
    level: 'introductory',
    hours: 1,
    languages: ['en'],
    providerAccess: 'free',
    price: { currency: 'EUR', minorUnits: 1000 },
    checkedOn: '2026-11-10',
    enrolment: 'none',
    ...change,
  };
}

const COURSES = [
  course('sheets', { title: 'Spreadsheets at work', topics: ['data'], hours: 2 }),
  course('ux', {
    languages: ['es'],
    topics: ['design'],
    level: 'advanced',
    hours: 12,
    providerAccess: 'paid',
  }),
  course('mixed', { provider: 'Provider B', hours: null, providerAccess: 'unknown' }),
  course('mid', { summary: 'Writing reports with care.', hours: 6, level: 'intermediate' }),
];

const ids = (found: readonly CatalogueCourse[]) => found.map(({ id }) => id);

describe('filterCourses', () => {
  it('returns the whole catalogue in its order with no filter', () => {
    expect(ids(filterCourses(COURSES, TOPICS, NO_FILTER))).toEqual([
      'sheets',
      'ux',
      'mixed',
      'mid',
    ]);
  });

  it('finds every word in the title, summary, provider or subject, ignoring case and accents', () => {
    const search = (text: string) => ids(filterCourses(COURSES, TOPICS, { ...NO_FILTER, text }));
    expect(search('SPREADSHEETS')).toEqual(['sheets']);
    expect(search('diseno')).toEqual(['ux']);
    expect(search('calculo work')).toEqual(['sheets']);
    expect(search('provider b')).toEqual(['mixed']);
    expect(search('reports care')).toEqual(['mid']);
    expect(search('spreadsheets design')).toEqual([]);
  });

  it('meets every condition set', () => {
    const only = (change: object) =>
      ids(filterCourses(COURSES, TOPICS, { ...NO_FILTER, ...change }));
    expect(only({ topic: 'data' })).toEqual(['sheets']);
    expect(only({ level: 'advanced' })).toEqual(['ux']);
    expect(only({ provider: 'Provider B' })).toEqual(['mixed']);
    expect(only({ duration: 'short' })).toEqual(['sheets']);
    expect(only({ duration: 'medium' })).toEqual(['mid']);
    expect(only({ duration: 'long' })).toEqual(['ux']);
    expect(only({ language: 'es' })).toEqual(['ux']);
    expect(only({ language: 'en' })).toEqual(['sheets', 'mixed', 'mid']);
  });
});

describe('the parts of the filter', () => {
  it('places stated hours in their range and leaves unstated hours out', () => {
    expect([2, 2.5, 10, 10.5].map(durationOf)).toEqual(['short', 'medium', 'medium', 'long']);
    expect(durationOf(null)).toBeNull();
  });

  it('folds text and says whether anything is set', () => {
    expect(fold('Diseño Ágil')).toBe('diseno agil');
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, text: '   ' })).toBe(false);
    expect(isFiltered({ ...NO_FILTER, level: 'advanced' })).toBe(true);
  });
});

describe('the languages of the catalogue', () => {
  it('lists the languages of the interface that the catalogue offers', () => {
    expect(catalogueLanguages(COURSES)).toEqual(['en', 'es']);
    expect(catalogueLanguages([course('a', { languages: ['en', 'zh'] })])).toEqual(['en']);
  });
});
