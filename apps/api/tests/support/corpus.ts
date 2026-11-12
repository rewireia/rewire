import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

/** One sentence of an evaluation corpus, with what the check should do with it. */
const entrySchema = z.object({
  text: z.string().min(1),
  lang: z.enum(['en', 'es']),
  expect: z.string(),
  /** Why the check gets this sentence wrong, for a sentence it is known to get wrong. */
  limit: z.string().optional(),
});

export type CorpusEntry = z.infer<typeof entrySchema>;

/** The sentences of a corpus in `tests/corpus/`. */
export function readCorpus(name: string): CorpusEntry[] {
  const path = fileURLToPath(new URL(`../corpus/${name}`, import.meta.url));
  return z.array(entrySchema).parse(JSON.parse(readFileSync(path, 'utf8')));
}

/** How a check did on a corpus: what it got right, of all, and the known limits it still hits. */
export function scoreOf(entries: readonly CorpusEntry[], outcome: (entry: CorpusEntry) => string) {
  const right = entries.filter((entry) => outcome(entry) === entry.expect).length;
  return {
    right,
    total: entries.length,
    percent: Math.round((right / entries.length) * 100),
    limits: entries.filter((entry) => entry.limit !== undefined).length,
  };
}
