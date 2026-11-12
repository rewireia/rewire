import { z } from 'zod';

import { READING_TYPES, readingContentSchema, type ReadingContent } from './schema.ts';
import data from './readings.json' with { type: 'json' };

/** One key for the same document under two addresses: no fragment and no trailing slash. */
function urlKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href.replace(/\/+$/, '');
}

/** Notes first, then guides, then reports; newest first within a kind; then by title. */
function compareReadings(a: ReadingContent, b: ReadingContent): number {
  return (
    READING_TYPES.indexOf(a.type) - READING_TYPES.indexOf(b.type) ||
    b.year - a.year ||
    a.title.localeCompare(b.title, 'en')
  );
}

/** The first value that appears more than once, or `undefined`. */
function firstRepeated(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }
  return undefined;
}

/**
 * Checks a list of readings: each against its schema, every id and every document once. The
 * answer is in the library's order, so the file and the page never depend on how it was written.
 */
export function parseReadings(input: unknown): readonly ReadingContent[] {
  const readings = z.array(readingContentSchema).parse(input);
  const id = firstRepeated(readings.map((reading) => reading.id));
  if (id !== undefined) {
    throw new Error(`the reading id ${id} is used more than once`);
  }
  const url = firstRepeated(readings.map((reading) => urlKey(reading.url)));
  if (url !== undefined) {
    throw new Error(`the document ${url} is listed more than once`);
  }
  return readings.toSorted(compareReadings);
}

/** Readings gathered from several lists, as an import brings them. */
export interface MergedReadings {
  readonly readings: readonly ReadingContent[];
  /** Readings left out because an earlier one links to the same document. */
  readonly duplicates: readonly ReadingContent[];
}

/**
 * Joins lists of readings into one: each is checked against the schema, a document already
 * listed is kept once (the first time it appears), and the result passes `parseReadings`.
 */
export function mergeReadings(lists: readonly unknown[]): MergedReadings {
  const kept = new Map<string, ReadingContent>();
  const duplicates: ReadingContent[] = [];
  for (const reading of lists.flatMap((list) => z.array(readingContentSchema).parse(list))) {
    const key = urlKey(reading.url);
    if (kept.has(key)) {
      duplicates.push(reading);
    } else {
      kept.set(key, reading);
    }
  }
  return { readings: parseReadings([...kept.values()]), duplicates };
}

/** The readings an import keeps for the library, and those it leaves out to stay balanced. */
export interface SelectedReadings {
  readonly readings: readonly ReadingContent[];
  readonly leftOut: readonly ReadingContent[];
}

/** How often each value has been chosen so far. */
function tally<Key extends string>(counts: Map<Key, number>, key: Key): number {
  return counts.get(key) ?? 0;
}

/**
 * Picks `perKind` readings of each kind, keeping scopes and topics as even as the candidates
 * allow. Within a kind it takes, one at a time, the candidate whose scope and then whose topic
 * have been chosen least so far; a tie goes to the library's order. The same candidates always
 * give the same choice.
 */
export function selectReadings(
  candidates: readonly ReadingContent[],
  perKind: number,
): SelectedReadings {
  const ordered = parseReadings(candidates);
  const chosen: ReadingContent[] = [];
  for (const type of READING_TYPES) {
    const pool = ordered.filter((reading) => reading.type === type);
    const scopes = new Map<ReadingContent['scope'], number>();
    const topics = new Map<ReadingContent['topic'], number>();
    while (pool.length > 0 && chosen.filter((reading) => reading.type === type).length < perKind) {
      const next = pool.reduce((best, reading) =>
        (tally(scopes, reading.scope) - tally(scopes, best.scope) ||
          tally(topics, reading.topic) - tally(topics, best.topic)) < 0
          ? reading
          : best,
      );
      pool.splice(pool.indexOf(next), 1);
      scopes.set(next.scope, tally(scopes, next.scope) + 1);
      topics.set(next.topic, tally(topics, next.topic) + 1);
      chosen.push(next);
    }
  }
  const kept = new Set(chosen.map((reading) => reading.id));
  return {
    readings: parseReadings(chosen),
    leftOut: ordered.filter((reading) => !kept.has(reading.id)),
  };
}

/** The readings of the library, checked when the module loads. */
export const LIBRARY_READINGS: readonly ReadingContent[] = parseReadings(data);
