import type { Reading } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { durationOf } from '../src/features/library/duration.ts';
import {
  choicesOf,
  EVERY_READING,
  filterReadings,
  initialFilters,
  lastReviewed,
  toggleScope,
} from '../src/features/library/filters.ts';

/** A reading made up for these tests only. */
function reading(id: string, change: Partial<Reading> = {}): Reading {
  return {
    id,
    type: 'guide',
    level: 'introductory',
    topic: 'jobs',
    scope: 'global',
    title: `Test reading ${id}`,
    source: 'Test publisher',
    year: 2025,
    url: `https://publisher.example/${id}`,
    format: 'web',
    language: 'en',
    minutes: 10,
    why: 'A reason.',
    checkedOn: '2026-11-10',
    ...change,
  };
}

const READINGS = [
  reading('global-note', { type: 'note', topic: 'rights' }),
  reading('eu-guide', { scope: 'eu', level: 'intermediate' }),
  reading('uk-report', { type: 'report', scope: 'uk', topic: 'policy', checkedOn: '2026-11-12' }),
  reading('us-guide', { scope: 'us', topic: 'learning', level: 'advanced' }),
];

const ids = (readings: readonly Reading[]) => readings.map(({ id }) => id);

describe('the filters of the library', () => {
  it('start with the person’s region and the global readings', () => {
    const filters = initialFilters('uk');
    expect(filters.scopes).toEqual(['global', 'uk']);
    expect(ids(filterReadings(READINGS, filters))).toEqual(['global-note', 'uk-report']);
  });

  it('keep every other region one toggle away, and can take one out again', () => {
    const scopes = toggleScope(initialFilters('uk').scopes, 'us');
    expect(ids(filterReadings(READINGS, { ...initialFilters('uk'), scopes }))).toEqual([
      'global-note',
      'uk-report',
      'us-guide',
    ]);
    expect(toggleScope(scopes, 'global')).toEqual(['uk', 'us']);
  });

  it('combine kind, topic and level', () => {
    expect(ids(filterReadings(READINGS, { ...EVERY_READING, type: 'guide' }))).toEqual([
      'eu-guide',
      'us-guide',
    ]);
    expect(ids(filterReadings(READINGS, { ...EVERY_READING, topic: 'policy' }))).toEqual([
      'uk-report',
    ]);
    expect(filterReadings(READINGS, { ...EVERY_READING, type: 'note', level: 'advanced' })).toEqual(
      [],
    );
  });

  it('offer only the topics and levels the library holds, in the contract’s order', () => {
    expect(choicesOf(READINGS)).toEqual({
      topics: ['jobs', 'learning', 'rights', 'policy'],
      levels: ['introductory', 'intermediate', 'advanced'],
    });
  });

  it('date the selection by its latest check, and by none when it is empty', () => {
    expect(lastReviewed(READINGS)).toBe('2026-11-12');
    expect(lastReviewed([])).toBeNull();
  });
});

describe('the reading time of a card', () => {
  it('is in minutes below an hour and a half, and in whole hours from then on', () => {
    expect(durationOf(89)).toEqual({ unit: 'minutes', value: 89 });
    expect(durationOf(90)).toEqual({ unit: 'hours', value: 2 });
    expect(durationOf(725)).toEqual({ unit: 'hours', value: 12 });
  });
});
