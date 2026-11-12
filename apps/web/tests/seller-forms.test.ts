import { describe, expect, it } from 'vitest';

import {
  dateOfLocalInput,
  endOf,
  localInputOf,
  validWindow,
} from '../src/features/marketplace/beacon-window.ts';
import {
  EMPTY_DRAFT,
  firstInvalid,
  readDraft,
  visibleErrors,
} from '../src/features/marketplace/seller-course-draft.ts';

const HOUR = 3_600_000;

describe('the window of a beacon', () => {
  const start = new Date(2026, 10, 12, 18, 5);

  it('is typed and read in the browser’s own time, to the minute', () => {
    expect(localInputOf(start)).toBe('2026-11-12T18:05');
    expect(dateOfLocalInput('2026-11-12T18:05')?.getTime()).toBe(start.getTime());
    expect(dateOfLocalInput('')).toBeNull();
    expect(dateOfLocalInput('tomorrow')).toBeNull();
  });

  it('ends an hour, three hours or at the next midnight after it starts', () => {
    expect(endOf(start, 'one-hour').getTime() - start.getTime()).toBe(HOUR);
    expect(endOf(start, 'three-hours').getTime() - start.getTime()).toBe(3 * HOUR);
    expect(localInputOf(endOf(start, 'midnight'))).toBe('2026-11-13T00:00');
  });

  it('must end in the future, after its start, within a week', () => {
    const now = start;
    expect(validWindow(start, new Date(start.getTime() + HOUR), now)).toBe(true);
    expect(validWindow(start, start, now)).toBe(false);
    expect(validWindow(start, new Date(start.getTime() + 169 * HOUR), now)).toBe(false);
  });
});

describe('the draft of a course', () => {
  const draft = {
    ...EMPTY_DRAFT,
    title: 'Spreadsheets with an AI assistant',
    summary: 'Formulas and clean tables with an AI assistant, checking every result it gives.',
    hours: '3',
    topics: ['ai-at-work'],
    accessUrl: 'https://learn.example.com/course',
    price: '24.5',
  };

  it('becomes the course the server is sent, with its price in minor units', () => {
    const read = readDraft(draft, 'eu', true);
    expect(read.errors).toEqual([]);
    expect(read.course).toMatchObject({
      region: 'eu',
      hours: 3,
      priceMinor: 2450,
      published: true,
    });
  });

  it('names each field that is not right yet', () => {
    expect(readDraft(EMPTY_DRAFT, 'us', true).errors.toSorted()).toEqual(
      ['accessUrl', 'hours', 'price', 'summary', 'title', 'topics'].toSorted(),
    );
    expect(readDraft({ ...draft, accessUrl: 'http://x.example.com' }, 'us', true).errors).toEqual([
      'accessUrl',
    ]);
  });
});

describe('the errors the form shows', () => {
  const errors = readDraft(EMPTY_DRAFT, 'us', true).errors;

  it('are none when the form opens, before any field is left', () => {
    expect([...visibleErrors(errors, new Set())]).toEqual([]);
  });

  it('are those of the fields left, and all of them once publishing is asked', () => {
    expect([...visibleErrors(errors, new Set(['title']))]).toEqual(['title']);
    const all = new Set(['title', 'summary', 'topics', 'hours', 'price', 'accessUrl'] as const);
    expect(visibleErrors(errors, all).size).toBe(6);
  });

  it('take the focus to the first wrong field, in the order of the form', () => {
    expect(firstInvalid(errors)).toBe('title');
    expect(firstInvalid(['accessUrl', 'hours', 'topics'])).toBe('topics');
    expect(firstInvalid([])).toBeUndefined();
  });
});
