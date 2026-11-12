import type { ReadingContent } from '@rewire/content';
import type { Library } from '@rewire/contracts';

/** The library as a reader of this language sees it: each reason in that language. */
export function libraryIn(readings: readonly ReadingContent[], language: 'en' | 'es'): Library {
  return { readings: readings.map((reading) => ({ ...reading, why: reading.why[language] })) };
}
