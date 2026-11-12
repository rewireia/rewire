import {
  readingLevelSchema,
  readingTopicSchema,
  type Reading,
  type ReadingLevel,
  type ReadingScope,
  type ReadingTopic,
  type ReadingType,
  type Region,
} from '@rewire/contracts';

/** What the person chose to see: one kind or all, a topic, a level, and where it applies. */
export interface LibraryFilters {
  readonly type: ReadingType | 'all';
  readonly topic: ReadingTopic | 'all';
  readonly level: ReadingLevel | 'all';
  readonly scopes: readonly ReadingScope[];
}

/** Every kind, topic and level, and readings of the person's region and of everywhere. */
export function initialFilters(region: Region): LibraryFilters {
  return { type: 'all', topic: 'all', level: 'all', scopes: ['global', region] };
}

/** Every reading, whatever its kind, topic, level and scope. */
export const EVERY_READING: LibraryFilters = {
  type: 'all',
  topic: 'all',
  level: 'all',
  scopes: ['global', 'eu', 'us', 'uk'],
};

/** The readings that meet every filter, in the order the library gives them. */
export function filterReadings(
  readings: readonly Reading[],
  filters: LibraryFilters,
): readonly Reading[] {
  return readings.filter(
    (reading) =>
      (filters.type === 'all' || reading.type === filters.type) &&
      (filters.topic === 'all' || reading.topic === filters.topic) &&
      (filters.level === 'all' || reading.level === filters.level) &&
      filters.scopes.includes(reading.scope),
  );
}

/** A scope added to the choice, or taken out of it. */
export function toggleScope(
  scopes: readonly ReadingScope[],
  scope: ReadingScope,
): readonly ReadingScope[] {
  return scopes.includes(scope) ? scopes.filter((each) => each !== scope) : [...scopes, scope];
}

/** The topics and levels the library holds, in the order of the contract, to offer as filters. */
export function choicesOf(readings: readonly Reading[]) {
  const topics = new Set(readings.map((reading) => reading.topic));
  const levels = new Set(readings.map((reading) => reading.level));
  return {
    topics: readingTopicSchema.options.filter((topic) => topics.has(topic)),
    levels: readingLevelSchema.options.filter((level) => levels.has(level)),
  };
}

/** The day the selection was last reviewed: the latest check of any reading, or `null`. */
export function lastReviewed(readings: readonly Reading[]): string | null {
  return readings.reduce<string | null>(
    (latest, { checkedOn }) => (latest === null || checkedOn > latest ? checkedOn : latest),
    null,
  );
}
