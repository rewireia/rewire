import { describe, expect, it } from 'vitest';

import {
  LIBRARY_READINGS,
  mergeReadings,
  parseReadings,
  selectReadings,
  type ReadingContent,
} from '../src/index.ts';

/** A reading made up for these tests only; the library lists none of these. */
function reading(id: string, change: Partial<ReadingContent> = {}): ReadingContent {
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
    minutes: 12,
    why: { en: 'Why in English.', es: 'Por qué, en castellano.' },
    checkedOn: '2026-11-12',
    ...change,
  };
}

describe('the readings of the library', () => {
  it('pass their own checks', () => {
    expect(parseReadings(LIBRARY_READINGS)).toEqual(LIBRARY_READINGS);
  });

  it('are put in order: notes, guides, reports; newest first; then by title', () => {
    const ordered = parseReadings([
      reading('b', { type: 'report', year: 2024 }),
      reading('c', { type: 'guide', year: 2023, title: 'Beta' }),
      reading('d', { type: 'guide', year: 2023, title: 'Alpha' }),
      reading('e', { type: 'note', year: 2020 }),
      reading('f', { type: 'guide', year: 2025 }),
    ]);
    expect(ordered.map(({ id }) => id)).toEqual(['e', 'f', 'd', 'c', 'b']);
  });

  it('refuse an id used twice', () => {
    expect(() =>
      parseReadings([reading('a'), reading('a', { url: 'https://other.example/a' })]),
    ).toThrow(/reading id a/);
  });

  it('refuse the same document twice, even under another fragment or a trailing slash', () => {
    expect(() =>
      parseReadings([
        reading('a', { url: 'https://publisher.example/doc' }),
        reading('b', { url: 'https://PUBLISHER.example/doc/#part-2' }),
      ]),
    ).toThrow(/listed more than once/);
  });

  it('refuse a link that is not https, a blank reason and an unknown field', () => {
    expect(() => parseReadings([reading('a', { url: 'http://publisher.example/a' })])).toThrow();
    expect(() => parseReadings([reading('a', { why: { en: ' ', es: 'Sí.' } })])).toThrow();
    expect(() => parseReadings([{ ...reading('a'), summary: 'copied text' }])).toThrow();
  });
});

describe('an import of readings', () => {
  it('joins lists, keeps each document the first time it appears and orders the result', () => {
    const first = [reading('a', { type: 'report' }), reading('b')];
    const second = [reading('c', { url: 'https://publisher.example/b/' }), reading('d')];
    const { readings, duplicates } = mergeReadings([first, second]);
    expect(readings.map(({ id }) => id)).toEqual(['b', 'd', 'a']);
    expect(duplicates.map(({ id }) => id)).toEqual(['c']);
  });

  it('stops on a reading that breaks the schema, rather than leaving it out', () => {
    expect(() => mergeReadings([[reading('a', { minutes: 0 })]])).toThrow();
  });
});

describe('the choice of readings an import keeps', () => {
  const scopes = ['global', 'global', 'global', 'global', 'eu', 'us', 'uk'] as const;
  const candidates = scopes.flatMap((scope, index) =>
    (['note', 'report'] as const).map((type) =>
      reading(`${type}-${String(index)}`, { type, scope, title: `Reading ${String(index)}` }),
    ),
  );

  it('keeps as many of each kind as asked, with the scopes as even as they can be', () => {
    const { readings, leftOut } = selectReadings(candidates, 4);
    for (const type of ['note', 'report'] as const) {
      const kept = readings.filter((each) => each.type === type);
      expect(kept).toHaveLength(4);
      expect(kept.map((each) => each.scope).sort()).toEqual(['eu', 'global', 'uk', 'us']);
    }
    expect(leftOut).toHaveLength(6);
    expect(parseReadings([...readings, ...leftOut])).toHaveLength(candidates.length);
  });

  it('evens out the topics among readings of the same scope', () => {
    const pool = [
      reading('a', { topic: 'jobs', title: 'A' }),
      reading('b', { topic: 'jobs', title: 'B' }),
      reading('c', { topic: 'rights', title: 'C' }),
    ];
    expect(selectReadings(pool, 2).readings.map(({ id }) => id)).toEqual(['a', 'c']);
  });

  it('gives the same choice whatever the order of the candidates', () => {
    const forward = selectReadings(candidates, 3).readings;
    expect(selectReadings(candidates.toReversed(), 3).readings).toEqual(forward);
  });

  it('keeps every candidate of a kind that has fewer than asked', () => {
    expect(selectReadings(candidates, 25).leftOut).toEqual([]);
  });
});
