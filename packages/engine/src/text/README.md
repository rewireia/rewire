# engine/src/text

How a title or a query becomes words, and how codes are ordered.

```text
text/
├── tokens.ts          fold, singular and tokensOf
├── stop-words.ts      words without meaning in English, Spanish, German, French and Italian
└── compare-codes.ts   code order by code units, the same on every machine
```

## Rules

- Titles and queries go through the same functions.
- Stop words are written as they look after `fold`: lower case and without accents.
- `compare-codes.ts` has a twin in `packages/data/pipeline/steps/`, because the engine imports
  nothing from the data pipeline; change both together.
