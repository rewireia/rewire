# engine/tests

One file per unit of `src/`, on small hand-written classifications of real occupations, and
`real-data.test.ts`, which runs search and profiles on the bundle shipped in `@rewire/data`.

```text
tests/
├── tokens.test.ts          folding, stop words and the singular rule
├── compare-codes.test.ts   code order that does not depend on the machine
├── title-index.test.ts     postings, rarity and the vocabulary of a region
├── search.test.ts          scores, prefixes and their completions, qualifiers and ordering
├── unit-group.test.ts      the bridge to ISCO-08: coded titles, links and alternatives
├── bands.test.ts           the ILO's task bands at their limits
├── profile.test.ts         task order, ranges, counts by band and the major group
├── standing.test.ts        the share of unit groups above and its three descriptions
├── personal.test.ts        a person's week: weights, unanswered tasks and the mean
├── apportion.test.ts       the largest-remainder split that always adds up
├── labour.test.ts          figures by level, and the ones a source does not publish
├── engine.test.ts          the engine over an in-memory bundle
├── real-data.test.ts       search, completions, labour and profiles on the shipped bundle
├── support/                builders shared by the tests
└── tsconfig.json           type checking for the tests
```

## Rules

- Where a rule holds for every input, it is checked over many cases in a loop.
- Run them with `npx vitest run packages/engine`.
