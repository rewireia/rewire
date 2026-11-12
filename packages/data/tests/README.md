# data/tests

Unit tests of the pipeline steps, the readers, the loader and the writer, built from small
hand-written records of real occupations, plus one check of the bundle committed in `bundle/`.

```text
tests/
├── ilo-exposure.test.ts          grouping, task order, gradients, rows that agree and row validation
├── esco-classification.test.ts   titles, languages, gendered forms and the expected total
├── onet-classification.test.ts   crosswalk link order, unresolved and orphan rows, missing descriptions
├── ons-classification.test.ts    coded titles, qualifiers and links by majority
├── bls-oews.test.ts              detailed occupations only, unpublished and top-coded figures
├── ons-aps-employment.test.ts    withheld figures, periods and the size of the response
├── ons-ashe-earnings.test.ts     unit groups only, the ONS's markers, notes below the table
├── eurostat-labour.test.ts       groups by level, unreliable figures, the fixed dimensions
├── json-stat.test.ts             reading JSON-stat along one dimension, sparse and dense
├── labour-schema.test.ts         codes that match the level of their series, whole figures
├── exposure-schema.test.ts       every major group of a unit group has a title
├── download.test.ts              API responses from the cache, and offline failures
├── titles.test.ts                whitespace collapsing and de-duplication of titles
├── csv.test.ts                   byte order mark, notes above the header
├── spreadsheet.test.ts           first or named sheet, rows above the header, on a built workbook
├── bundle.test.ts                loading, and refusing altered, unlisted or absent files or a bad manifest
├── write-bundle.test.ts          manifest, reproducible bytes and retrieval days
├── check-bundle.test.ts          files the manifest leaves out or lists without having them
├── compare-codes.test.ts         code order that does not depend on the machine
├── coverage.test.ts              the bridge coverage measure
├── real-bundle.test.ts           the committed bundle: integrity, size, coverage and labour floors
├── support/                      builders shared by the tests
└── tsconfig.json                 type checking for the tests
```

## Rules

- Run them with `npx vitest run packages/data`.
- Tests that write files use a fresh folder under the system temporary directory and remove it
  afterwards; none of them uses the network or the download cache.
